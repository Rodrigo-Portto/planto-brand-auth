import { extractErrorMessage, getAuthenticatedUser, supabaseRest } from './_lib/supabase';

const PROFILE_FIELDS = ['name', 'email', 'phone', 'address', 'website', 'instagram', 'market_niche', 'education', 'specialties', 'avatar_url'];
const BRAND_CORE_FIELDS = ['proposito', 'origem', 'metodo', 'impacto', 'publico', 'dores', 'desejos', 'objecoes', 'diferenciais', 'valores', 'personalidade', 'tom', 'promessa', 'posicionamento'];
const HUMAN_CORE_FIELDS = ['trajetoria', 'formacao', 'abordagem', 'especializacoes', 'publico_atendido', 'contexto_clinico', 'etica', 'limites', 'motivacao', 'estilo_relacional', 'comunicacao', 'presenca_digital', 'referencias', 'diferenciais_humanos', 'medos', 'sonhos'];

function pickFields(source, allowed) {
  const input = source && typeof source === 'object' ? source : {};
  const output = {};

  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      output[field] = input[field] ?? null;
    }
  }

  return output;
}

async function upsertById(table, userId, payload) {
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

  return Array.isArray(data) ? data[0] : row;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
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
    return res.status(400).json({ error: 'Campo resource é obrigatório.' });
  }

  try {
    if (resource === 'profile') {
      const saved = await upsertById('user_profiles', userId, pickFields(payload, PROFILE_FIELDS));
      return res.status(200).json({ success: true, profile: saved });
    }

    if (resource === 'brand_core') {
      const saved = await upsertById('brand_core_responses', userId, pickFields(payload, BRAND_CORE_FIELDS));
      return res.status(200).json({ success: true, brand_core: saved });
    }

    if (resource === 'human_core') {
      const saved = await upsertById('human_core_responses', userId, pickFields(payload, HUMAN_CORE_FIELDS));
      return res.status(200).json({ success: true, human_core: saved });
    }

    if (resource === 'gpt_entry') {
      if (action === 'delete') {
        const entryId = String(payload?.id || '').trim();
        if (!entryId) {
          return res.status(400).json({ error: 'ID da entrada é obrigatório para exclusão.' });
        }

        const { response, data } = await supabaseRest(`/rest/v1/gpt_saved_entries?id=eq.${encodeURIComponent(entryId)}&user_id=eq.${encodeURIComponent(userId)}`, {
          method: 'DELETE',
          headers: { Prefer: 'return=representation' },
        });

        if (!response.ok) {
          throw new Error(extractErrorMessage(data, 'Falha ao excluir entrada GPT.'));
        }

        return res.status(200).json({ success: true });
      }

      const row = {
        user_id: userId,
        entry_type: payload?.entry_type || 'note',
        title: payload?.title || 'Entrada GPT',
        content_json: payload?.content_json || null,
        summary: payload?.summary || null,
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

      return res.status(200).json({ success: true, entry: Array.isArray(data) ? data[0] : null });
    }

    if (resource === 'legacy_document') {
      const type = String(payload?.type || '').trim();
      const content = String(payload?.content || '').trim();

      if (!type || !content) {
        return res.status(400).json({ error: 'Campos type e content são obrigatórios.' });
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

    return res.status(400).json({ error: `Resource não suportado: ${resource}` });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno ao salvar.' });
  }
}
