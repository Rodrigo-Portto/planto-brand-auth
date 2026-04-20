import type { NextApiRequest, NextApiResponse } from 'next';
import {
  INTEGRATED_BRIEFING_FIELDS,
  PROFILE_FIELDS,
  buildFormProgress,
  getFieldsForSection,
  isProfileComplete,
  isSectionComplete,
} from '../../lib/domain/briefing';
import { generateAndPersistContext, markContextStructurePending } from '../../lib/server/contextGeneration';
import type { BrandContextResponseRecord, GptEntry, IntegratedBriefing, Profile } from '../../types/dashboard';
import { extractErrorMessage, getAuthenticatedUser, supabaseRest } from './_lib/supabase';

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

async function upsertById<T>(table: string, userId: string, payload: Partial<T>) {
  const row = {
    id: userId,
    ...payload,
    updated_at: new Date().toISOString(),
  };

  const { response, data } = await supabaseRest(`/rest/v1/${table}?on_conflict=id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: row,
  });

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, `Falha ao salvar ${table}.`));
  }

  return Array.isArray(data) ? (data[0] as T) : (row as T);
}

async function fetchOneById<T>(table: string, userId: string): Promise<T | null> {
  const { response, data } = await supabaseRest(`/rest/v1/${table}?id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, `Falha ao buscar ${table}.`));
  }
  return Array.isArray(data) && data.length ? (data[0] as T) : null;
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
      const profileCompletedAt = isProfileComplete(saved)
        ? payload?.profile_completed_at || new Date().toISOString()
        : null;

      await upsertById<BrandContextResponseRecord>('brand_context_responses', userId, {
        profile_completed_at: profileCompletedAt,
      });

      const progress = buildFormProgress({
        profile_completed_at: profileCompletedAt,
      });

      await markContextStructurePending({
        userId,
        progress,
      }).catch(() => null);

      return res.status(200).json({
        success: true,
        profile: saved,
        form_progress: progress,
      });
    }

    if (resource === 'brand_core' || resource === 'human_core') {
      const section = resource;
      const fields = getFieldsForSection(section);
      const sectionPayload = pickFields<IntegratedBriefing>(payload, fields);
      const mergedRow = {
        ...sectionPayload,
        ...(section === 'brand_core'
          ? { brand_core_saved_at: isSectionComplete('brand_core', sectionPayload as IntegratedBriefing) ? new Date().toISOString() : null }
          : { human_core_saved_at: isSectionComplete('human_core', sectionPayload as IntegratedBriefing) ? new Date().toISOString() : null }),
        integrated_briefing_saved_at: null,
      };

      const isComplete = isSectionComplete(section, mergedRow as IntegratedBriefing);
      if (!isComplete) {
        return res.status(400).json({ error: `Preencha todos os campos de ${section === 'brand_core' ? 'Brand Core' : 'Human Core'} antes de salvar.` });
      }

      const saved = await upsertById<BrandContextResponseRecord>('brand_context_responses', userId, mergedRow);
      const profile = (await fetchOneById<Profile>('user_profiles', userId)) || {};
      const progress = buildFormProgress({
        profile_completed_at: isProfileComplete(profile) ? saved.profile_completed_at || null : null,
        brand_core_saved_at: saved.brand_core_saved_at || null,
        human_core_saved_at: saved.human_core_saved_at || null,
        integrated_briefing_saved_at: saved.integrated_briefing_saved_at || null,
      });

      await markContextStructurePending({ userId, progress }).catch(() => null);

      return res.status(200).json({
        success: true,
        integrated_briefing: saved,
        form_progress: progress,
      });
    }

    if (resource === 'integrated_briefing') {
      const saved = await upsertById<IntegratedBriefing>(
        'brand_context_responses',
        userId,
        pickFields<IntegratedBriefing>(payload, INTEGRATED_BRIEFING_FIELDS)
      );
      return res.status(200).json({ success: true, integrated_briefing: saved });
    }

    if (resource === 'integrated_briefing_finalize') {
      const profile = (await fetchOneById<Profile>('user_profiles', userId)) || {};
      const integratedBriefing = ((await fetchOneById<BrandContextResponseRecord>('brand_context_responses', userId)) ||
        {}) as BrandContextResponseRecord;
      const progress = buildFormProgress({
        profile_completed_at: isProfileComplete(profile) ? integratedBriefing.profile_completed_at || null : null,
        brand_core_saved_at: integratedBriefing.brand_core_saved_at || null,
        human_core_saved_at: integratedBriefing.human_core_saved_at || null,
      });

      if (!progress.is_ready_for_final_save) {
        return res.status(400).json({ error: 'Perfil, Brand Core e Human Core precisam estar salvos antes do briefing integrado.' });
      }

      const finalizedBriefing = await upsertById<BrandContextResponseRecord>('brand_context_responses', userId, {
        integrated_briefing_saved_at: new Date().toISOString(),
      });

      const contextStructure = await generateAndPersistContext({
        userId,
        profile,
        integratedBriefing: finalizedBriefing,
      });

      return res.status(200).json({
        success: true,
        integrated_briefing: finalizedBriefing,
        form_progress: buildFormProgress({
          profile_completed_at: progress.profile_completed_at,
          brand_core_saved_at: progress.brand_core_saved_at,
          human_core_saved_at: progress.human_core_saved_at,
          integrated_briefing_saved_at: finalizedBriefing.integrated_briefing_saved_at || null,
        }),
        context_structure: contextStructure,
      });
    }

    if (resource === 'gpt_entry') {
      if (action === 'delete') {
        const entryId = String(payload?.id || '').trim();
        if (!entryId) {
          return res.status(400).json({ error: 'ID da entrada e obrigatorio para exclusao.' });
        }

        const { response, data } = await supabaseRest(
          `/rest/v1/gpt_saved_entries?id=eq.${encodeURIComponent(entryId)}&user_id=eq.${encodeURIComponent(userId)}`,
          {
            method: 'DELETE',
            headers: { Prefer: 'return=representation' },
          }
        );

        if (!response.ok) {
          throw new Error(extractErrorMessage(data, 'Falha ao excluir entrada GPT.'));
        }

        return res.status(200).json({ success: true });
      }

      if (action === 'update') {
        const entryId = String(payload?.id || '').trim();
        if (!entryId) {
          return res.status(400).json({ error: 'ID da entrada e obrigatorio para edicao.' });
        }

        const row = {
          entry_type: payload?.entry_type || 'note',
          title: payload?.title || 'Entrada GPT',
          content_json: payload?.content_json || null,
          source: payload?.source || 'dashboard',
          updated_at: new Date().toISOString(),
        };

        const { response, data } = await supabaseRest(
          `/rest/v1/gpt_saved_entries?id=eq.${encodeURIComponent(entryId)}&user_id=eq.${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: row,
          }
        );

        if (!response.ok) {
          throw new Error(extractErrorMessage(data, 'Falha ao atualizar entrada GPT.'));
        }

        return res.status(200).json({ success: true, entry: Array.isArray(data) ? (data[0] as GptEntry) : null });
      }

      const row = {
        user_id: userId,
        entry_type: payload?.entry_type || 'note',
        title: payload?.title || 'Entrada GPT',
        content_json: payload?.content_json || null,
        source: payload?.source || 'dashboard',
        updated_at: new Date().toISOString(),
      };

      const { response, data } = await supabaseRest('/rest/v1/gpt_saved_entries', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: row,
      });

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Falha ao salvar entrada GPT.'));
      }

      return res.status(200).json({ success: true, entry: Array.isArray(data) ? (data[0] as GptEntry) : null });
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

    return res.status(400).json({ error: `Resource nao suportado: ${resource}` });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno ao salvar.' });
  }
}
