import { createClient } from "jsr:@supabase/supabase-js@2";

const BATCH_SIZE = 20;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ITEM_KEYS = new Set([
  "identidade.nome_marca", "identidade.area_atuacao", "identidade.especialidades", "identidade.momento_atual",
  "negocio.oferta_central", "negocio.problema_que_resolve", "negocio.capacidade_real",
  "negocio.diferenciacao_principal", "negocio.limites_atuacao", "negocio.formato_entrega",
  "negocio.prova", "negocio.autoridade", "negocio.posicionamento", "negocio.proposta_valor", "negocio.metodo",
  "pessoas.publico_prioritario", "pessoas.nivel_maturidade_publico", "pessoas.dor_principal",
  "pessoas.dores_secundarias", "pessoas.objecao_principal", "pessoas.objecoes_secundarias",
  "pessoas.desejo_principal", "pessoas.desejos_secundarios", "pessoas.tensao_central",
  "pessoas.criterios_confianca", "pessoas.momento_busca", "pessoas.tentativas_anteriores",
  "pessoas.promessa",
  "comunicacao.crenca_central", "comunicacao.tese_principal", "comunicacao.mensagem_central",
  "comunicacao.tom_de_voz", "comunicacao.palavras_chave", "comunicacao.rejeicoes",
  "comunicacao.territorios_editoriais", "comunicacao.narrativa", "comunicacao.editorial", "comunicacao.territorio",
  "identidade.proposito",
  "diferenciacao.diferenciacao_principal",
  "proposta_valor.proposta_valor",
]);

const ALLOWED_GROUPS = new Set(["identidade", "negocio", "pessoas", "comunicacao", "diferenciacao", "proposta_valor"]);
const ALLOWED_KINDS = new Set(["knowledge", "insight", "fact"]);
const ALLOWED_TRUTH_TYPES = new Set(["declared", "inferred"]);

const SYSTEM_PROMPT = `
Você é uma IA interna do Plattô responsável por identificar conhecimento estratégico de marca.

Você receberá entradas brutas do dia a dia de um usuário: notas, arquivos processados e respostas estruturadas de briefing.
Sua função é extrair apenas os insights que revelam algo relevante sobre a identidade, negócio, público ou comunicação da marca.

Regras:
- Ignore conteúdo genérico, tarefas operacionais ou informações sem valor estratégico
- Reduza cada insight a uma frase curta e objetiva
- truth_type: "declared" se o usuário afirmou algo explicitamente; "inferred" se você deduziu
- confidence: 0.0 a 1.0
- is_canonical: true apenas para verdades centrais e estáveis da marca
- Pode retornar array vazio se não houver nada relevante
- item_kind: use "fact" para dados objetivos, "knowledge" para estratégia estruturada, "insight" para inferências

## IMPORTANTE: item_key deve seguir obrigatoriamente o formato grupo.campo
Use EXATAMENTE as chaves da lista abaixo. NUNCA use chaves sem namespace (ex: "prova", "objecoes", "tom_de_voz").

## Chaves válidas:
negocio.oferta_central, negocio.problema_que_resolve, negocio.capacidade_real, negocio.diferenciacao_principal,
negocio.limites_atuacao, negocio.formato_entrega, negocio.prova, negocio.autoridade, negocio.metodo,
pessoas.publico_prioritario, pessoas.nivel_maturidade_publico, pessoas.dor_principal, pessoas.dores_secundarias,
pessoas.objecao_principal, pessoas.objecoes_secundarias, pessoas.desejo_principal, pessoas.desejos_secundarios,
pessoas.tensao_central, pessoas.criterios_confianca, pessoas.momento_busca, pessoas.tentativas_anteriores,
comunicacao.crenca_central, comunicacao.tese_principal, comunicacao.mensagem_central, comunicacao.tom_de_voz,
comunicacao.palavras_chave, comunicacao.territorios_editoriais, comunicacao.narrativa, comunicacao.editorial,
identidade.nome_marca, identidade.area_atuacao, identidade.especialidades, identidade.momento_atual, identidade.proposito

## Exemplos corretos de item_key:
- "negocio.prova" (CORRETO) — nunca "prova" (ERRADO)
- "comunicacao.tom_de_voz" (CORRETO) — nunca "tom_de_voz" (ERRADO)
- "pessoas.objecao_principal" (CORRETO) — nunca "objecoes" (ERRADO)

Retorne apenas JSON com { "items": [...] }.
`.trim();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isMissingTableError(error: any) {
  return error?.code === "PGRST205" || String(error?.message || "").includes("Could not find the table");
}

async function safeRows<T>(query: PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const { data, error } = await query;
  if (error && !isMissingTableError(error)) throw new Error(error.message);
  return data ?? [];
}

function normalizeItem(userId: string, item: any, sourceAttachmentId?: string | null, sourceMemoryNoteId?: string | null) {
  const itemKey = String(item?.item_key || "").trim();
  const itemGroup = String(item?.item_group || "").trim();
  const itemKind = String(item?.item_kind || "").trim();
  const truthType = String(item?.truth_type || "").trim();
  const valueText = typeof item?.value_text === "string" ? item.value_text.trim() : "";
  const sourceTable = String(item?.source_table || "").trim();
  const sourceId = String(item?.source_id || "").trim();

  if (!ALLOWED_ITEM_KEYS.has(itemKey)) return null;
  if (!ALLOWED_GROUPS.has(itemGroup)) return null;
  if (!itemKey.startsWith(`${itemGroup}.`)) return null;
  if (!ALLOWED_KINDS.has(itemKind)) return null;
  if (!ALLOWED_TRUTH_TYPES.has(truthType)) return null;
  if (!valueText || !sourceTable || !sourceId) return null;

  return {
    user_id: userId,
    item_key: itemKey,
    item_group: itemGroup,
    item_kind: itemKind,
    value_text: valueText,
    value_json: null,
    truth_type: truthType,
    confidence: Math.min(1, Math.max(0, Number(item?.confidence) || 0.5)),
    is_canonical: Boolean(item?.is_canonical),
    status: "active",
    source_table: sourceTable,
    source_id: sourceId,
    source_attachment_id: sourceAttachmentId ?? null,
    source_memory_note_id: sourceMemoryNoteId ?? null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();

  if (!supabaseUrl || !supabaseKey || !openaiKey) {
    return json({ error: "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const body = await req.json().catch(() => ({}));
  const requestedUserId = typeof body?.user_id === "string" ? body.user_id.trim() : null;

  const now = new Date().toISOString();
  const stats = {
    users_processed: 0,
    items_promoted: 0,
    strategic_promoted: 0,
    errors: 0,
    error_messages: [] as string[],
    entries_by_source: {} as Record<string, number>,
  };

  let userIds: Set<string>;

  if (requestedUserId) {
    userIds = new Set([requestedUserId]);
  } else {
    const [noteUsers, attachmentUsers, briefingUsers] = await Promise.all([
      safeRows<{ user_id: string }>(supabase.from("memory_notes").select("user_id").is("promoted_at", null).limit(50)),
      safeRows<{ user_id: string }>(supabase.from("user_attachments").select("user_id").is("promoted_at", null).not("content_text", "is", null).limit(50)),
      safeRows<{ user_id: string }>(
        supabase.from("brand_context_responses")
          .select("user_id")
          .eq("response_status", "active")
          .eq("answer_type", "briefing")
          .is("promoted_at", null)
          .not("value_text", "is", null)
          .limit(50)
      ),
    ]);

    userIds = new Set<string>([
      ...noteUsers.map((row) => row.user_id),
      ...attachmentUsers.map((row) => row.user_id),
      ...briefingUsers.map((row) => row.user_id),
    ]);

    if (userIds.size === 0) {
      return json({ users_processed: 0, items_promoted: 0, message: "Nada pendente de promoção. Pipeline encerrado." });
    }
  }

  for (const userId of userIds) {
    try {
      const strategicResponses = await safeRows<{ id: string }>(
        supabase
          .from("brand_context_responses")
          .select("id")
          .eq("user_id", userId)
          .eq("answer_type", "strategic")
          .is("promoted_at", null)
          .not("value_text", "is", null)
          .limit(BATCH_SIZE),
      );

      for (const response of strategicResponses) {
        const promoted = await supabase.rpc("promote_strategic_response_to_knowledge", { p_response_id: response.id });
        if (promoted.error) {
          stats.errors += 1;
          stats.error_messages.push(`strategic_promote:${response.id}: ${promoted.error.message}`);
        } else {
          stats.strategic_promoted += 1;
          stats.entries_by_source.brand_context_responses_strategic = (stats.entries_by_source.brand_context_responses_strategic ?? 0) + 1;
        }
      }

      const entries: { source_table: string; id: string; text: string; source_attachment_id?: string | null; source_memory_note_id?: string | null }[] = [];

      const notes = await safeRows<{ id: string; note_content: string | null; context_type: string | null; source_attachment_id: string | null }>(
        supabase
          .from("memory_notes")
          .select("id,note_content,context_type,source_attachment_id")
          .eq("user_id", userId)
          .is("promoted_at", null)
          .in("context_type", ["decisao_estrategica", "insight_agente", "nota_usuario", "observacao_mercado"])
          .limit(BATCH_SIZE),
      );
      for (const note of notes) {
        if (note.note_content?.trim()) entries.push({
          source_table: "memory_notes",
          id: note.id,
          text: note.note_content,
          source_attachment_id: note.source_attachment_id ?? null,
          // Nota é sua própria fonte — source_memory_note_id = o próprio id
          source_memory_note_id: note.id,
        });
      }

      const attachments = await safeRows<{ id: string; content_text: string | null }>(
        supabase
          .from("user_attachments")
          .select("id,content_text")
          .eq("user_id", userId)
          .is("promoted_at", null)
          .not("content_text", "is", null)
          .limit(BATCH_SIZE),
      );
      for (const attachment of attachments) {
        if (attachment.content_text?.trim()) {
          // Anexo é sua própria fonte — source_attachment_id = o próprio id
          entries.push({ source_table: "user_attachments", id: attachment.id, text: attachment.content_text.slice(0, 3000), source_attachment_id: attachment.id });
        }
      }

      const briefingResponses = await safeRows<{ id: string; field_key: string | null; value_text: string | null; value_json: unknown | null; source_attachment_id: string | null }>(
        supabase
          .from("brand_context_responses")
          .select("id,field_key,value_text,value_json,source_attachment_id")
          .eq("user_id", userId)
          .eq("response_status", "active")
          .eq("answer_type", "briefing")
          .not("value_text", "is", null)
          .is("promoted_at", null)
          .limit(BATCH_SIZE),
      );

      const sourceIds = briefingResponses.map((row) => row.id).filter(Boolean);
      const existingKnowledge = sourceIds.length > 0
        ? await safeRows<{ source_id: string }>(
            supabase
              .from("brand_knowledge")
              .select("source_id")
              .eq("user_id", userId)
              .eq("source_table", "brand_context_responses")
              .in("source_id", sourceIds),
          )
        : [];
      const alreadyPromoted = new Set(existingKnowledge.map((row) => row.source_id));

      for (const response of briefingResponses) {
        if (!response.id || alreadyPromoted.has(response.id)) continue;
        if (!response.value_text?.trim()) continue;
        entries.push({
          source_table: "brand_context_responses",
          id: response.id,
          source_attachment_id: response.source_attachment_id ?? null,
          text: JSON.stringify({
            field_key: response.field_key,
            value_text: response.value_text,
            value_json: response.value_json ?? null,
          }).slice(0, 3000),
        });
      }

      if (entries.length === 0 && strategicResponses.length === 0) continue;

      if (entries.length > 0) {
        for (const entry of entries) {
          stats.entries_by_source[entry.source_table] = (stats.entries_by_source[entry.source_table] ?? 0) + 1;
        }

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: JSON.stringify({ user_id: userId, entries }) },
            ],
          }),
        });

        if (!aiResponse.ok) throw new Error(`OpenAI ${aiResponse.status}: ${await aiResponse.text()}`);

        const aiData = await aiResponse.json();
        const outputText = aiData.choices?.[0]?.message?.content || "{\"items\":[]}";
        const parsed = JSON.parse(outputText);
        const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
        // Construir mapas de rastreabilidade por entry para propagar ao knowledge
        const attachmentIdByEntry = new Map<string, string | null>();
        const memoryNoteIdByEntry = new Map<string, string | null>();
        for (const entry of entries) {
          const key = `${entry.source_table}:${entry.id}`;
          attachmentIdByEntry.set(key, entry.source_attachment_id ?? null);
          memoryNoteIdByEntry.set(key, entry.source_memory_note_id ?? null);
        }

        const validItems = rawItems.map((item: any) => {
          const key = `${item.source_table}:${item.source_id}`;
          const attachId = attachmentIdByEntry.get(key) ?? null;
          const noteId   = memoryNoteIdByEntry.get(key) ?? null;
          return normalizeItem(userId, item, attachId, noteId);
        }).filter(Boolean);

        const itemsByKey = new Map<string, any>();
        for (const item of validItems) {
          const existing = itemsByKey.get(item.item_key);
          if (!existing || Number(item.confidence) > Number(existing.confidence) || (item.is_canonical && !existing.is_canonical)) {
            itemsByKey.set(item.item_key, item);
          }
        }

        const uniqueItems = [...itemsByKey.values()];
        if (uniqueItems.length > 0) {
          const itemKeys = uniqueItems.map((item) => item.item_key);

          const existingInBank = await safeRows<{ item_key: string; confidence: number }>(
            supabase
              .from("brand_knowledge")
              .select("item_key,confidence")
              .eq("user_id", userId)
              .eq("status", "active")
              .in("item_key", itemKeys)
          );
          const bankConfidence = new Map(existingInBank.map(e => [e.item_key, Number(e.confidence)]));

          const itemsToUpdate = uniqueItems.filter((item) => {
            const bankConf = bankConfidence.get(item.item_key);
            return bankConf === undefined || item.is_canonical || Number(item.confidence) >= bankConf;
          });

          if (itemsToUpdate.length > 0) {
            const keysToUpdate = itemsToUpdate.map((item) => item.item_key);

            // Arquivar registros ativos existentes com as mesmas item_keys
            const archived = await supabase
              .from("brand_knowledge")
              .update({ status: "archived", updated_at: now })
              .eq("user_id", userId)
              .eq("status", "active")
              .in("item_key", keysToUpdate);
            if (archived.error) throw new Error(archived.error.message);

            // CORREÇÃO: usar INSERT em vez de upsert para evitar ambiguidade de constraint
            // O archive acima garante que não há conflito de status=active
            const inserted = await supabase
              .from("brand_knowledge")
              .insert(itemsToUpdate);

            if (inserted.error) {
              // Fallback: se ainda houver conflito na constraint source, atualizar via update
              if (inserted.error.message.includes("duplicate") || inserted.error.code === "23505") {
                for (const item of itemsToUpdate) {
                  const upserted = await supabase
                    .from("brand_knowledge")
                    .update({
                      value_text: item.value_text,
                      confidence: item.confidence,
                      is_canonical: item.is_canonical,
                      status: "active",
                      updated_at: now,
                    })
                    .eq("user_id", userId)
                    .eq("source_table", item.source_table)
                    .eq("source_id", item.source_id)
                    .eq("item_key", item.item_key);
                  if (upserted.error) {
                    stats.errors += 1;
                    stats.error_messages.push(`update_fallback:${item.item_key}: ${upserted.error.message}`);
                  }
                }
              } else {
                throw new Error(inserted.error.message);
              }
            }

            stats.items_promoted += itemsToUpdate.length;
          }
        }

        const byTable = entries.reduce((acc: Record<string, string[]>, entry) => {
          if (!acc[entry.source_table]) acc[entry.source_table] = [];
          acc[entry.source_table].push(entry.id);
          return acc;
        }, {});

        for (const [table, ids] of Object.entries(byTable)) {
          await supabase.from(table).update({ promoted_at: now }).in("id", ids);
        }
      }

      stats.users_processed += 1;
    } catch (error) {
      stats.errors += 1;
      stats.error_messages.push(error instanceof Error ? error.message : String(error));
    }
  }

  return json(stats);
});
