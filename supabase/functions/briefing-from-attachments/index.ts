// briefing-from-attachments v1.0.0
// Responsabilidade: processar um único anexo de forma isolada e gerar brand_context_responses.
// Cada execução é atômica por attachment_id — sem dependência de outros anexos.
// O vínculo source_attachment_id é propagado em todos os registros gerados.
// Quem conecta o conhecimento de múltiplos anexos é o GPT via semantic_search.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Mapa canônico das 28 perguntas do briefing — usado para mapear respostas extraídas
const BRIEFING_FIELDS = [
  { order: 1,  field_key: "nome_marca",              form_type: "identidade" },
  { order: 2,  field_key: "area_atuacao",             form_type: "identidade" },
  { order: 3,  field_key: "especialidades",           form_type: "identidade" },
  { order: 4,  field_key: "momento_atual",            form_type: "identidade" },
  { order: 5,  field_key: "oferta_central",           form_type: "negocio" },
  { order: 6,  field_key: "problema_que_resolve",     form_type: "negocio" },
  { order: 7,  field_key: "diferenciacao_principal",  form_type: "negocio" },
  { order: 8,  field_key: "capacidade_real",          form_type: "negocio" },
  { order: 9,  field_key: "formato_entrega",          form_type: "negocio" },
  { order: 10, field_key: "prova",                    form_type: "negocio" },
  { order: 11, field_key: "autoridade",               form_type: "negocio" },
  { order: 12, field_key: "publico_prioritario",      form_type: "pessoas" },
  { order: 13, field_key: "nivel_maturidade_publico", form_type: "pessoas" },
  { order: 14, field_key: "dor_principal",            form_type: "pessoas" },
  { order: 15, field_key: "dores_secundarias",        form_type: "pessoas" },
  { order: 16, field_key: "objecao_principal",        form_type: "pessoas" },
  { order: 17, field_key: "objecoes_secundarias",     form_type: "pessoas" },
  { order: 18, field_key: "desejo_principal",         form_type: "pessoas" },
  { order: 19, field_key: "desejos_secundarios",      form_type: "pessoas" },
  { order: 20, field_key: "tensao_central",           form_type: "pessoas" },
  { order: 21, field_key: "criterios_confianca",      form_type: "pessoas" },
  { order: 22, field_key: "momento_busca",            form_type: "pessoas" },
  { order: 23, field_key: "tentativas_anteriores",    form_type: "pessoas" },
  { order: 24, field_key: "crenca_central",           form_type: "comunicacao" },
  { order: 25, field_key: "tese_principal",           form_type: "comunicacao" },
  { order: 26, field_key: "mensagem_central",         form_type: "comunicacao" },
  { order: 27, field_key: "tom_de_voz",               form_type: "comunicacao" },
  { order: 28, field_key: "territorios_editoriais",   form_type: "comunicacao" },
];

const SYSTEM_PROMPT = `
Você é uma IA interna do Planttô responsável por extrair informações de marca a partir de documentos enviados pelo usuário.

Você receberá o conteúdo bruto de UM único documento. Sua função é identificar quais informações do briefing de marca estão presentes nesse documento e extraí-las de forma estruturada.

REGRAS IMPORTANTES:
- Analise APENAS o documento fornecido. Não invente informações que não estão no texto.
- Cada item extraído deve ter um field_key correspondente ao mapa de campos do briefing.
- Se um campo não estiver presente no documento, simplesmente não o inclua.
- value_text deve ser uma síntese clara e objetiva do que foi encontrado no documento.
- extraction_confidence: 0.0 a 1.0 — use 1.0 apenas para informações explícitas e inequívocas.
- answer_type: sempre "briefing" para informações estruturadas do briefing.

Retorne apenas JSON com { "responses": [...] }.
Cada item deve ter: field_key, form_type, value_text, extraction_confidence.
`.trim();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const openaiKey   = Deno.env.get("OPENAI_API_KEY")?.trim();

  if (!supabaseUrl || !supabaseKey || !openaiKey) {
    return json({ error: "Missing env vars" }, 500);
  }

  const body = await req.json().catch(() => ({}));
  const attachmentId = typeof body?.attachment_id === "string" ? body.attachment_id.trim() : null;

  if (!attachmentId) {
    return json({ error: "attachment_id é obrigatório" }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Buscar o anexo — contexto isolado: apenas este attachment_id
  const { data: attachment, error: attachErr } = await supabase
    .from("user_attachments")
    .select("id, user_id, filename, content_text, pipeline_status")
    .eq("id", attachmentId)
    .maybeSingle();

  if (attachErr) return json({ error: attachErr.message }, 500);
  if (!attachment) return json({ error: "Anexo não encontrado" }, 404);
  if (!attachment.content_text?.trim()) {
    return json({ error: "Anexo sem conteúdo extraído", attachment_id: attachmentId }, 422);
  }

  const userId = attachment.user_id;

  // 2. Marcar como em processamento
  await supabase
    .from("user_attachments")
    .update({ pipeline_status: "processing" })
    .eq("id", attachmentId);

  try {
    // 3. Chamar OpenAI — contexto APENAS do documento atual, sem histórico de outros anexos
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
          {
            role: "user",
            content: JSON.stringify({
              filename: attachment.filename,
              // Limitar a 12.000 chars para caber no contexto do modelo
              content: attachment.content_text.slice(0, 12000),
              briefing_fields: BRIEFING_FIELDS.map(f => ({ field_key: f.field_key, form_type: f.form_type })),
            }),
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI ${aiResponse.status}: ${await aiResponse.text()}`);
    }

    const aiData     = await aiResponse.json();
    const outputText = aiData.choices?.[0]?.message?.content || '{"responses":[]}';
    const parsed     = JSON.parse(outputText);
    const rawItems   = Array.isArray(parsed?.responses) ? parsed.responses : [];

    // 4. Validar e montar os registros — todos com source_attachment_id
    const validResponses: any[] = [];
    for (const item of rawItems) {
      const fieldKey  = typeof item?.field_key === "string" ? item.field_key.trim() : "";
      const formType  = typeof item?.form_type === "string" ? item.form_type.trim() : "";
      const valueText = typeof item?.value_text === "string" ? item.value_text.trim() : "";
      const confidence = Math.min(1, Math.max(0, Number(item?.extraction_confidence) || 0.5));

      const meta = BRIEFING_FIELDS.find(f => f.field_key === fieldKey);
      if (!meta || !valueText) continue;

      validResponses.push({
        user_id:               userId,
        field_key:             fieldKey,
        form_type:             formType || meta.form_type,
        value_text:            valueText,
        answer_type:           "briefing",
        response_status:       "active",
        extraction_confidence: confidence,
        // Rastreabilidade: vínculo direto com o anexo de origem
        source_attachment_id:  attachmentId,
      });
    }

    // 5. Inserir respostas — cada uma rastreável ao attachment_id
    let inserted = 0;
    if (validResponses.length > 0) {
      const { error: insertErr } = await supabase
        .from("brand_context_responses")
        .insert(validResponses);

      if (insertErr) throw new Error(`insert brand_context_responses: ${insertErr.message}`);
      inserted = validResponses.length;
    }

    // 6. Marcar o anexo como processado
    await supabase
      .from("user_attachments")
      .update({
        pipeline_status: "briefed",
        last_pipeline_triggered_at: new Date().toISOString(),
      })
      .eq("id", attachmentId);

    // 7. Disparar promote-knowledge para este usuário (assíncrono — não bloqueia)
    fetch(`${supabaseUrl}/functions/v1/promote-knowledge`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    }).catch(() => {/* fire-and-forget */});

    return json({
      success: true,
      attachment_id:     attachmentId,
      user_id:           userId,
      responses_created: inserted,
    });

  } catch (err) {
    // Marcar como erro para reprocessamento
    await supabase
      .from("user_attachments")
      .update({
        pipeline_status: "error",
        pipeline_error:  err instanceof Error ? err.message : String(err),
      })
      .eq("id", attachmentId);

    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
