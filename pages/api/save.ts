import type { NextApiRequest, NextApiResponse } from 'next';
import {
  BRIEFING_FORM_CONFIG,
  PROFILE_FIELDS,
  buildBriefingRowsFromRecord,
  getLatestBriefingUpdateAt,
  buildFormProgress,
  isBriefingComplete,
  isProfileComplete,
  normalizeBriefingRecord,
} from '../../lib/domain/briefing';
import {
  EDITORIAL_LINE_FIELDS,
  EDITORIAL_LINE_MAX_SLOTS,
  EDITORIAL_LINE_MIN_SLOTS,
  createEditorialLineSlots,
  createDefaultEditorialLineRecord,
  normalizeEditorialLineRows,
} from '../../lib/domain/editorialLine';
import { generateAndPersistContext } from '../../lib/server/contextGeneration';
import type {
  BriefingFormResponseRecord,
  BriefingResponseRow,
  DailyNote,
  DailyNoteData,
  EditorialLineRecord,
  EditorialLineRow,
  GptEntry,
  Profile,
} from '../../types/dashboard';
import {
  BRAND_LIBRARY_BUCKET,
  createSignedStorageUrl,
  extractErrorMessage,
  extractStoragePathFromAvatarValue,
  getAuthenticatedUser,
  supabaseRest,
} from './_lib/supabase';

const PROFILE_FIELD_KEYS = PROFILE_FIELDS.map((field) => field.key);

function pickFields<T extends object>(source: unknown, allowed: Array<keyof T>) {
  const input = source && typeof source === 'object' ? (source as Record<string, unknown>) : {};
  const output: Partial<T> = {};

  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      output[field] = (input[field as string] ?? null) as T[keyof T];
    }
  }

  return output;
}

async function upsertByColumn<T>(table: string, idColumn: string, idValue: string, payload: Partial<T>) {
  const row = {
    [idColumn]: idValue,
    ...payload,
    updated_at: new Date().toISOString(),
  };

  const { response, data } = await supabaseRest(`/rest/v1/${table}?on_conflict=${idColumn}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: row,
  });

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, `Falha ao salvar ${table}.`));
  }

  return Array.isArray(data) ? (data[0] as T) : (row as T);
}

async function upsertById<T>(table: string, userId: string, payload: Partial<T>) {
  return upsertByColumn<T>(table, 'id', userId, payload);
}

async function upsertByUserId<T>(table: string, userId: string, payload: Partial<T>) {
  return upsertByColumn<T>(table, 'user_id', userId, payload);
}

async function fetchOneByColumn<T>(table: string, column: string, value: string): Promise<T | null> {
  const { response, data } = await supabaseRest(
    `/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=*&limit=1`
  );
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, `Falha ao buscar ${table}.`));
  }
  return Array.isArray(data) && data.length ? (data[0] as T) : null;
}

async function fetchManyByColumn<T>(table: string, column: string, value: string): Promise<T[]> {
  const { response, data } = await supabaseRest(
    `/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=*`
  );
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, `Falha ao buscar ${table}.`));
  }
  return Array.isArray(data) ? (data as T[]) : [];
}

async function fetchOneById<T>(table: string, userId: string): Promise<T | null> {
  return fetchOneByColumn<T>(table, 'id', userId);
}

async function archiveActiveBriefingRows(userId: string) {
  const { response, data } = await supabaseRest(
    `/rest/v1/brand_context_responses?user_id=eq.${encodeURIComponent(userId)}&form_type=eq.${encodeURIComponent(BRIEFING_FORM_CONFIG.form_id)}&response_status=eq.active`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: {
        response_status: 'archived',
        updated_at: new Date().toISOString(),
      },
    }
  );

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, 'Falha ao arquivar respostas anteriores do briefing.'));
  }
}

async function insertBriefingRows(rows: BriefingResponseRow[]) {
  if (!rows.length) return [];

  const { response, data } = await supabaseRest('/rest/v1/brand_context_responses', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: rows,
  });

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, 'Falha ao salvar respostas do briefing.'));
  }

  return Array.isArray(data) ? (data as BriefingResponseRow[]) : [];
}

function buildProgressWithEditorialLine(
  profile: Profile,
  integratedBriefing: BriefingFormResponseRecord,
  editorialLine: EditorialLineRecord | null
) {
  return buildFormProgress({
    profile_completed_at: isProfileComplete(profile) ? (profile as Profile & { updated_at?: string | null }).updated_at || new Date().toISOString() : null,
    briefing_saved_at:
      isBriefingComplete(integratedBriefing.briefing_blocks) ? getLatestBriefingUpdateAt(integratedBriefing.response_rows) : null,
    integrated_briefing_saved_at: integratedBriefing.integrated_briefing_saved_at || null,
    editorial_line_saved_at: editorialLine?.updated_at || editorialLine?.created_at || null,
  });
}

function parseEditorialLinePayload(payload: unknown) {
  const record = createDefaultEditorialLineRecord(payload as Partial<EditorialLineRecord> | null);
  const inputRows = Array.isArray((payload as EditorialLineRecord | null | undefined)?.rows)
    ? ((payload as EditorialLineRecord).rows as EditorialLineRow[])
    : [];

  if (inputRows.length < EDITORIAL_LINE_MIN_SLOTS || inputRows.length > EDITORIAL_LINE_MAX_SLOTS) {
    throw new Error(`A linha editorial precisa conter entre ${EDITORIAL_LINE_MIN_SLOTS} e ${EDITORIAL_LINE_MAX_SLOTS} linhas.`);
  }

  const receivedSlots = inputRows.map((row) => String(row?.slot || '').trim());
  const normalizedRows = normalizeEditorialLineRows(inputRows);
  const expectedSlots = createEditorialLineSlots(inputRows.length);

  if (receivedSlots.length !== expectedSlots.length) {
    throw new Error(`A linha editorial precisa conter entre ${EDITORIAL_LINE_MIN_SLOTS} e ${EDITORIAL_LINE_MAX_SLOTS} linhas.`);
  }

  expectedSlots.forEach((slot, index) => {
    if (receivedSlots[index] !== slot) {
      throw new Error(`Os slots da linha editorial devem ser sequenciais entre 01 e ${expectedSlots[expectedSlots.length - 1]}.`);
    }
  });

  return {
    rows: normalizedRows.map<EditorialLineRow>((row) =>
      EDITORIAL_LINE_FIELDS.reduce<EditorialLineRow>(
        (accumulator, field) => {
          accumulator[field] = String(record.rows.find((current) => current.slot === row.slot)?.[field] || '').trim();
          return accumulator;
        },
        {
          slot: row.slot,
          titulo: '',
          objetivo: '',
          metrica: '',
          territorio: '',
          tensao: '',
          mensagem: '',
          formato: '',
        }
      )
    ),
  };
}

function parseDailyNotePayload(payload: unknown) {
  const input = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const noteDate = String(input.note_date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
    throw new Error('Data da nota invalida. Use o formato YYYY-MM-DD.');
  }

  const rawData = input.note_data && typeof input.note_data === 'object' ? (input.note_data as Record<string, unknown>) : {};
  const noteData: DailyNoteData = {
    title: String(rawData.title || '').trim(),
    content: String(rawData.content || '').trim(),
    tag: String(rawData.tag || '').trim(),
  };

  if (!noteData.title || !noteData.content) {
    throw new Error('Titulo e conteudo da nota sao obrigatorios.');
  }

  return {
    note_date: noteDate,
    note_data: noteData,
  };
}

function resolveNoteDate(value: unknown) {
  const candidate = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return candidate;
  }

  return new Date().toISOString().slice(0, 10);
}

function parseGptEntryAsDailyNote(payload: unknown) {
  const input = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const contentJson =
    input.content_json && typeof input.content_json === 'object' ? (input.content_json as Record<string, unknown>) : {};
  const title = String(input.title || '').trim() || 'Entrada GPT';
  const content = String(input.content_text || contentJson.text || input.content || '').trim();
  const tag = String(input.entry_type || input.tag || '').trim();

  if (!content) {
    throw new Error('Conteudo da entrada e obrigatorio.');
  }

  return {
    note_date: resolveNoteDate(input.note_date),
    note_data: {
      title,
      content,
      tag,
    },
  };
}

function mapDailyNoteToGptEntry(note: DailyNote): GptEntry {
  return {
    id: note.id,
    entry_type: note.note_data?.tag || 'note',
    title: note.note_data?.title || 'Entrada GPT',
    content_json: {
      text: note.note_data?.content || '',
    },
    source: 'daily_notes',
    created_at: note.created_at || null,
    updated_at: note.updated_at || null,
  };
}

async function resolveProfileAvatarUrl(profile: Profile): Promise<Profile> {
  const avatarValue = String(profile?.avatar_url || '').trim();
  if (!avatarValue) return profile;

  const storagePath = extractStoragePathFromAvatarValue(avatarValue, BRAND_LIBRARY_BUCKET);
  if (!storagePath) return profile;

  try {
    const signedUrl = await createSignedStorageUrl(BRAND_LIBRARY_BUCKET, storagePath, 60 * 60 * 24 * 30);
    return { ...profile, avatar_url: signedUrl };
  } catch {
    return { ...profile, avatar_url: '' };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown> | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = auth.user.id;
  const resource = String(req.body?.resource || '').trim();
  const action = String(req.body?.action || '').trim();
  const payload = req.body?.payload || {};

  if (!resource) {
    return res.status(400).json({ error: 'Campo resource e obrigatorio.' });
  }

  try {
    if (resource === 'profile') {
      const saved = await upsertById<Profile>('user_profiles', userId, pickFields<Profile>(payload, PROFILE_FIELD_KEYS));
      const resolvedProfile = await resolveProfileAvatarUrl(saved);
      const profileCompletedAt = isProfileComplete(saved)
        ? ((saved as Profile & { updated_at?: string | null }).updated_at || new Date().toISOString())
        : null;

      const currentBriefingRows = await fetchManyByColumn<BriefingResponseRow>('brand_context_responses', 'user_id', userId);
      const currentBriefing = normalizeBriefingRecord({
        briefing_form_id: BRIEFING_FORM_CONFIG.form_id,
        response_rows: currentBriefingRows.filter(
          (row) => row.form_type === BRIEFING_FORM_CONFIG.form_id && row.response_status === 'active'
        ),
      });
      const currentEditorialLine = await fetchOneByColumn<EditorialLineRecord>('editorial_lines', 'user_id', userId);

      const progress = buildFormProgress({
        profile_completed_at: profileCompletedAt,
        briefing_saved_at: isBriefingComplete(currentBriefing.briefing_blocks) ? getLatestBriefingUpdateAt(currentBriefing.response_rows) : null,
        integrated_briefing_saved_at: null,
        editorial_line_saved_at: currentEditorialLine?.updated_at || currentEditorialLine?.created_at || null,
      });

      return res.status(200).json({
        success: true,
        profile: resolvedProfile,
        form_progress: progress,
      });
    }

    if (resource === 'integrated_briefing') {
      const normalizedPayload = normalizeBriefingRecord(payload as Partial<BriefingFormResponseRecord> | null);
      const rowsToInsert = buildBriefingRowsFromRecord(userId, normalizedPayload);

      await archiveActiveBriefingRows(userId);
      const insertedRows = await insertBriefingRows(rowsToInsert);
      const saved = normalizeBriefingRecord({
        briefing_form_id: BRIEFING_FORM_CONFIG.form_id,
        response_rows: insertedRows,
      });
      const profile = (await fetchOneById<Profile>('user_profiles', userId)) || {};
      const editorialLine = await fetchOneByColumn<EditorialLineRecord>('editorial_lines', 'user_id', userId);
      const progress = buildProgressWithEditorialLine(profile, saved, editorialLine);

      return res.status(200).json({
        success: true,
        integrated_briefing: saved,
        form_progress: progress,
      });
    }

    if (resource === 'integrated_briefing_finalize') {
      const profile = (await fetchOneById<Profile>('user_profiles', userId)) || {};
      const integratedBriefingRows = await fetchManyByColumn<BriefingResponseRow>('brand_context_responses', 'user_id', userId);
      const integratedBriefing = normalizeBriefingRecord({
        briefing_form_id: BRIEFING_FORM_CONFIG.form_id,
        response_rows: integratedBriefingRows.filter(
          (row) => row.form_type === BRIEFING_FORM_CONFIG.form_id && row.response_status === 'active'
        ),
      });
      const editorialLine = await fetchOneByColumn<EditorialLineRecord>('editorial_lines', 'user_id', userId);
      const progress = buildProgressWithEditorialLine(profile, integratedBriefing, editorialLine);

      if (!progress.is_ready_for_final_save) {
        return res.status(400).json({ error: 'Perfil, briefing e linha editorial precisam estar salvos antes do contexto integrado.' });
      }

      const generatedContext = await generateAndPersistContext({
        userId,
        profile,
        integratedBriefing,
        editorialLine: createDefaultEditorialLineRecord(editorialLine, userId),
      });

      return res.status(200).json({
        success: true,
        integrated_briefing: integratedBriefing,
        form_progress: buildFormProgress({
          ...progress,
          integrated_briefing_saved_at: generatedContext.generated_at || new Date().toISOString(),
        }),
      });
    }

    if (resource === 'editorial_line') {
      const saved = await upsertByUserId<EditorialLineRecord>('editorial_lines', userId, parseEditorialLinePayload(payload));
      const profile = (await fetchOneById<Profile>('user_profiles', userId)) || {};
      const integratedBriefingRows = await fetchManyByColumn<BriefingResponseRow>('brand_context_responses', 'user_id', userId);
      const integratedBriefing = normalizeBriefingRecord({
        briefing_form_id: BRIEFING_FORM_CONFIG.form_id,
        response_rows: integratedBriefingRows.filter(
          (row) => row.form_type === BRIEFING_FORM_CONFIG.form_id && row.response_status === 'active'
        ),
      });
      const normalizedSaved = createDefaultEditorialLineRecord(saved, userId);
      const progress = buildProgressWithEditorialLine(profile, integratedBriefing, normalizedSaved);

      return res.status(200).json({
        success: true,
        editorial_line: normalizedSaved,
        form_progress: progress,
      });
    }

    if (resource === 'gpt_entry') {
      if (action === 'delete') {
        const entryId = String(payload?.id || '').trim();
        if (!entryId) {
          return res.status(400).json({ error: 'ID da entrada e obrigatorio para exclusao.' });
        }

        const { response, data } = await supabaseRest(
          `/rest/v1/daily_notes?id=eq.${encodeURIComponent(entryId)}&user_id=eq.${encodeURIComponent(userId)}`,
          {
            method: 'DELETE',
            headers: { Prefer: 'return=representation' },
          }
        );

        if (!response.ok) {
          throw new Error(extractErrorMessage(data, 'Falha ao excluir nota diaria.'));
        }

        return res.status(200).json({ success: true });
      }

      if (action === 'update') {
        const entryId = String(payload?.id || '').trim();
        if (!entryId) {
          return res.status(400).json({ error: 'ID da entrada e obrigatorio para edicao.' });
        }

        const parsed = parseGptEntryAsDailyNote(payload);
        const row = {
          note_date: parsed.note_date,
          note_data: parsed.note_data,
          updated_at: new Date().toISOString(),
        };

        const { response, data } = await supabaseRest(
          `/rest/v1/daily_notes?id=eq.${encodeURIComponent(entryId)}&user_id=eq.${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: row,
          }
        );

        if (!response.ok) {
          throw new Error(extractErrorMessage(data, 'Falha ao atualizar nota diaria.'));
        }

        const note = Array.isArray(data) ? (data[0] as DailyNote) : null;
        return res.status(200).json({ success: true, entry: note ? mapDailyNoteToGptEntry(note) : null });
      }

      const parsed = parseGptEntryAsDailyNote(payload);
      const row = {
        user_id: userId,
        note_date: parsed.note_date,
        note_data: parsed.note_data,
        updated_at: new Date().toISOString(),
      };

      const { response, data } = await supabaseRest('/rest/v1/daily_notes', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: row,
      });

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Falha ao salvar nota diaria.'));
      }

      const note = Array.isArray(data) ? (data[0] as DailyNote) : null;
      return res.status(200).json({ success: true, entry: note ? mapDailyNoteToGptEntry(note) : null });
    }

    if (resource === 'legacy_document') {
      const type = String(payload?.type || '').trim();
      const content = String(payload?.content || '').trim();

      if (!type || !content) {
        return res.status(400).json({ error: 'Campos type e content sao obrigatorios.' });
      }

      const { response, data } = await supabaseRest('/rest/v1/brand_documents?on_conflict=user_id,type', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: {
          user_id: userId,
          type,
          content,
          updated_at: new Date().toISOString(),
        },
      });

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Falha ao salvar documento legado.'));
      }

      return res.status(200).json({ success: true, document: Array.isArray(data) ? data[0] : null });
    }

    if (resource === 'daily_note') {
      if (action === 'delete') {
        const noteId = String(payload?.id || '').trim();
        if (!noteId) {
          return res.status(400).json({ error: 'ID da nota e obrigatorio para exclusao.' });
        }

        const { response, data } = await supabaseRest(
          `/rest/v1/daily_notes?id=eq.${encodeURIComponent(noteId)}&user_id=eq.${encodeURIComponent(userId)}`,
          {
            method: 'DELETE',
            headers: { Prefer: 'return=representation' },
          }
        );

        if (!response.ok) {
          throw new Error(extractErrorMessage(data, 'Falha ao excluir nota diaria.'));
        }

        return res.status(200).json({ success: true });
      }

      if (action === 'update') {
        const noteId = String(payload?.id || '').trim();
        if (!noteId) {
          return res.status(400).json({ error: 'ID da nota e obrigatorio para edicao.' });
        }

        const parsed = parseDailyNotePayload(payload);
        const row = {
          note_date: parsed.note_date,
          note_data: parsed.note_data,
          updated_at: new Date().toISOString(),
        };

        const { response, data } = await supabaseRest(
          `/rest/v1/daily_notes?id=eq.${encodeURIComponent(noteId)}&user_id=eq.${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: row,
          }
        );

        if (!response.ok) {
          throw new Error(extractErrorMessage(data, 'Falha ao atualizar nota diaria.'));
        }

        return res.status(200).json({ success: true, note: Array.isArray(data) ? (data[0] as DailyNote) : null });
      }

      const parsed = parseDailyNotePayload(payload);
      const row = {
        user_id: userId,
        note_date: parsed.note_date,
        note_data: parsed.note_data,
        updated_at: new Date().toISOString(),
      };

      const { response, data } = await supabaseRest('/rest/v1/daily_notes', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: row,
      });

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Falha ao salvar nota diaria.'));
      }

      return res.status(200).json({ success: true, note: Array.isArray(data) ? (data[0] as DailyNote) : null });
    }

    return res.status(400).json({ error: `Resource nao suportado: ${resource}` });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno ao salvar.' });
  }
}
