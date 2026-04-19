import { extractErrorMessage, getAuthenticatedUser, supabaseRest } from './_lib/supabase';

const PROFILE_FIELDS = ['name', 'email', 'phone', 'address', 'website', 'instagram', 'market_niche', 'education', 'specialties', 'avatar_url'];
const INTEGRATED_BRIEFING_FIELDS = [
  'oferta_central',
  'processo_mecanismo',
  'capacidade_real',
  'limites_restricoes',
  'resultados_percebidos',
  'provas_credibilidade',
  'diferenciacao_real',
  'crencas_visao_mundo',
  'experiencia_consistente',
  'presenca_profissional',
  'publico_prioritario',
  'momento_busca',
  'tentativas_anteriores',
  'queixa_declarada',
  'dor_profunda',
  'desejos_transformacao',
  'tensoes_contradicoes',
  'criterios_confianca',
  'objecoes_desalinhamentos',
  'linguagem_repertorio',
];

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
      const saved = await upsertById('user_profiles', userId, pickFields(payload, PROFILE_FIELDS));
      return res.status(200).json({ success: true, profile: saved });
    }

    if (resource === 'integrated_briefing') {
      const saved = await upsertById('brand_context_responses', userId, pickFields(payload, INTEGRATED_BRIEFING_FIELDS));
      return res.status(200).json({ success: true, integrated_briefing: saved });
    }

    if (resource === 'gpt_entry') {
      if (action === 'delete') {
        const entryId = String(payload?.id || '').trim();
        if (!entryId) {
          return res.status(400).json({ error: 'ID da entrada e obrigatorio para exclusao.' });
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

        const { response, data } = await supabaseRest(`/rest/v1/gpt_saved_entries?id=eq.${encodeURIComponent(entryId)}&user_id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: row,
        });

        if (!response.ok) {
          throw new Error(extractErrorMessage(data, 'Falha ao atualizar entrada GPT.'));
        }

        return res.status(200).json({ success: true, entry: Array.isArray(data) ? data[0] : null });
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

      return res.status(200).json({ success: true, entry: Array.isArray(data) ? data[0] : null });
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
    return res.status(500).json({ error: error.message || 'Erro interno ao salvar.' });
  }
}
