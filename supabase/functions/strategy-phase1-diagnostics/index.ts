// strategy-phase1-diagnostics
// Responsabilidade: avaliar dimensões estratégicas, gerar score e diagnóstico por dimensão.
// Tabelas gravadas: strategic_assessments (cabeçalho), strategic_diagnostics
// Ao finalizar, atualiza pipeline_phase para 'phase2_pending', disparando a Phase 2 via trigger.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Constantes ────────────────────────────────────────────────────────────────

const BASE_DIMENSIONS = [
  "oferta_clareza", "publico_clareza", "diferenciacao",
  "promessa", "prova", "autoridade", "consistencia_narrativa",
  "maturidade_editorial", "objecoes", "tom_de_voz",
] as const;

const BRANDING_MODEL_KEYS = ["posicionamento", "proposta_valor", "promessa", "proposito"] as const;

const ALLOWED_MATURITY_LEVELS = new Set([
  "dados_insuficientes", "inicial", "em_desenvolvimento", "consolidado", "exemplar",
]);

const STAGE_MAP: Record<string, string> = {
  inicio:           "Marca em estágio inicial. Scores baixos em prova, autoridade e maturidade_editorial são ESPERADOS — não os classifique como gaps críticos. Use maturity_level='dados_insuficientes' quando o score baixo for causado por ausência de dados.",
  validacao:        "Marca em validação. prova, autoridade e maturidade_editorial baixos são ESPERADOS — não os classifique como gaps críticos. Use maturity_level='dados_insuficientes' quando o score baixo for causado por ausência de dados.",
  crescimento:      "Marca em crescimento. diferenciacao e consistencia_narrativa são as dimensões críticas neste estágio.",
  reposicionamento: "Marca em reposicionamento. Avalie coerência entre posicionamento antigo e novo. Foco em diferenciacao, promessa e tom_de_voz.",
  escala:           "Marca em escala. Avalie todas as dimensões com rigor máximo. Foco especial em prova, autoridade e maturidade_editorial.",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clamp(value: unknown, min: number, max: number, fallback: number | null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function cleanText(value: unknown, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanLowerToken(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function extractOutputText(d: any) {
  if (typeof d?.output_text === "string" && d.output_text.trim()) return d.output_text;
  for (const item of (Array.isArray(d?.output) ? d.output : [])) {
    for (const part of (Array.isArray(item?.content) ? item.content : [])) {
      if (typeof part?.text === "string" && part.text.trim()) return part.text;
    }
  }
  return "";
}

async function safeRows<T>(q: PromiseLike<{ data: T[] | null; error: any }>, label: string): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

// ─── Contexto ──────────────────────────────────────────────────────────────────

async function getSourceContext(supabase: any, userId: string, snapshotAt: string | null) {
  const [userProfile, plataformaMarca, dimensionMap, brandContextResponsesAll] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("market_niche, business_stage, main_services, ideal_client, modalidade, weekly_content_frequency, main_marketing_difficulty, client_maturity, priority_channels")
      .eq("id", userId)
      .maybeSingle(),
    safeRows(
      supabase
        .from("plataforma_marca")
        .select("model_key, branding_concept, status, updated_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("model_key"),
      "plataforma_marca",
    ),
    safeRows(
      supabase
        .from("strategic_dimension_map")
        .select("dimension_key, label, item_group, field_key_prefix")
        .order("dimension_key"),
      "strategic_dimension_map",
    ),
    safeRows(
      supabase
        .from("brand_context_responses")
        .select("id, field_key, value_text, form_type, answer_type, response_status, updated_at")
        .eq("user_id", userId)
        .eq("response_status", "active")
        .order("updated_at", { ascending: false })
        .limit(150),
      "brand_context_responses_all",
    ),
  ]);

  const deltaFilter = (q: any) => snapshotAt ? q.gt("updated_at", snapshotAt) : q;
  const deltaFilterCreated = (q: any) => snapshotAt ? q.gt("created_at", snapshotAt) : q;

  const [brandKnowledgeDelta, brandContextDelta, memoryNotesDelta, knowledgeLinksDelta] = await Promise.all([
    safeRows(
      deltaFilter(
        supabase
          .from("brand_knowledge")
          .select("id, item_key, item_group, value_text, confidence, is_canonical, updated_at")
          .eq("user_id", userId)
          .eq("status", "active")
      ).order("updated_at", { ascending: false }).limit(200),
      "brand_knowledge_delta",
    ),
    safeRows(
      deltaFilter(
        supabase
          .from("brand_context_responses")
          .select("id, field_key, value_text, answer_type, updated_at")
          .eq("user_id", userId)
          .eq("response_status", "active")
      ).order("updated_at", { ascending: false }).limit(150),
      "brand_context_delta",
    ),
    safeRows(
      deltaFilter(
        supabase
          .from("memory_notes")
          .select("note_content, context_type, updated_at")
          .eq("user_id", userId)
      ).order("updated_at", { ascending: false }).limit(100),
      "memory_notes_delta",
    ),
    safeRows(
      deltaFilterCreated(
        supabase
          .from("knowledge_links")
          .select("from_item_id, to_item_id, relation_type, strength, relation_label")
          .eq("user_id", userId)
      ).order("created_at", { ascending: false }).limit(100),
      "knowledge_links_delta",
    ),
  ]);

  const completeModelKeys = new Set(
    (plataformaMarca as any[])
      .filter(m => typeof m.branding_concept === "string" && m.branding_concept.trim().length > 0)
      .map(m => m.model_key)
  );
  const brandingModelsComplete = BRANDING_MODEL_KEYS.every(k => completeModelKeys.has(k));
  const missingModelKeys       = BRANDING_MODEL_KEYS.filter(k => !completeModelKeys.has(k));

  const activeDimensions: string[] = (dimensionMap as any[]).length > 0
    ? (dimensionMap as any[]).map(d => d.dimension_key)
    : [...BASE_DIMENSIONS];

  const lastKnowledgeUpdatedAt = (brandKnowledgeDelta as any[]).length > 0
    ? (brandKnowledgeDelta as any[]).reduce(
        (latest: string, row: any) => row.updated_at > latest ? row.updated_at : latest,
        (brandKnowledgeDelta as any[])[0].updated_at
      )
    : snapshotAt;

  return {
    userProfile: (userProfile as any).data ?? null,
    plataformaMarca: plataformaMarca as any[],
    activeDimensions,
    brandingModelsComplete,
    missingModelKeys,
    brandKnowledgeDelta: brandKnowledgeDelta as any[],
    brandContextDelta: brandContextDelta as any[],
    brandContextResponsesAll: brandContextResponsesAll as any[],
    memoryNotesDelta: memoryNotesDelta as any[],
    knowledgeLinksDelta: knowledgeLinksDelta as any[],
    knowledge_snapshot_at: lastKnowledgeUpdatedAt,
    is_first_assessment: snapshotAt === null,
  };
}

// ─── Prompt e Schema ───────────────────────────────────────────────────────────

function buildSystemPrompt(
  businessStage: string | null,
  isFirstAssessment: boolean,
  activeDimensions: string[],
) {
  const stageGuidance = businessStage && STAGE_MAP[businessStage]
    ? `\n## Calibração por estágio\n${STAGE_MAP[businessStage]}`
    : "";

  const incrementalRule = isFirstAssessment
    ? `## Primeiro assessment\nNão há assessment anterior. Avalie o contexto completo presente em delta.`
    : `## Assessment incremental\nO campo anchor contém o assessment anterior. Reutilize o raciocínio anterior como base e ajuste apenas as dimensões afetadas pelos itens em delta.new_*. Preencha delta_impact explicando o que as novas entradas mudaram.`;

  return `
Você é uma IA interna do Planttô. Sua única tarefa nesta chamada é avaliar a maturidade estratégica de marca por dimensão.

Regras gerais:
- Use somente os dados recebidos no payload — nunca invente informações.
- Trate user_context como ground truth de maior peso (declarado pelo próprio usuário).
- Priorize itens com is_canonical=true e confidence alta como evidência principal.
- Gere exatamente as dimensões listadas em dimensions[].
- Scores são de 0 a 100; confidence é de 0 a 1.

## Rubrica geral de scores (0-100)
- 0–20:  dimensão ausente ou não articulada nos dados recebidos
- 21–40: mencionada sem consistência ou evidência real
- 41–60: presente com clareza razoável, fraquezas identificáveis
- 61–80: bem articulada, sustentada por evidência, aplicável na prática
- 81–100: exemplar — clara, diferenciada, consistente e operacional

## Rubricas Cirúrgicas por Dimensão

### oferta_clareza
Avalie se qualquer pessoa leiga entende o que é vendido, como é entregue e a que preço.
Score 80+: formato, escopo e modelo de negócio imediatamente compreensíveis sem explicação adicional.
Diagnosis deve apontar: o que está confuso — formato, escopo, preço ou público-alvo da oferta.
Recommendation deve focar em: empacotamento, precificação ou clareza de escopo. Cite o elemento específico a corrigir.

### publico_clareza
Avalie o nível de consciência do público, suas dores reais e seu momento de compra.
Score 80+: público definido por comportamento e problema concreto, não apenas por faixa etária ou profissão.
Diagnosis deve apontar: se o público está vago, mal segmentado ou descrito apenas por demografia.
Recommendation deve focar em: segmentação por dor, qualificação por momento de compra ou mapeamento de objeções por perfil.

### diferenciacao
Avalie o fosso entre a marca e os concorrentes diretos — o que a torna insubstituível.
Score 80+: possui ângulo único que não pode ser copiado facilmente (método próprio, visão de mundo polarizadora, ativo exclusivo).
Diagnosis deve apontar: se a diferenciação é genérica ("atendimento personalizado") ou real e defensável.
Recommendation deve focar em: criar contraste explícito com o mercado, nomear o ângulo único ou documentar o método proprietário.

### promessa
Avalie a transformação central garantida ao cliente — o que ele consegue ao contratar.
Score 80+: promessa tangível, com resultado específico, limite de tempo ou escopo claro, sem adjetivos vazios.
Diagnosis deve apontar: se a promessa é vaga, não mensurável ou igual à de qualquer concorrente.
Recommendation deve focar em: tornar a promessa específica com verbo de resultado + prazo ou condição verificável.

### prova
Avalie as evidências documentadas que sustentam a promessa da marca.
Score 80+: cases de estudo com dados concretos, depoimentos verificáveis e demonstrações de resultado publicadas.
Diagnosis deve apontar: se há ausência de cases, depoimentos superficiais ou resultados não documentados.
Recommendation deve focar em: coleta de depoimentos estruturados, documentação de um case específico ou publicação de dados de resultado.

### autoridade
Avalie a percepção externa e o status da marca no mercado — reconhecimento por terceiros.
Score 80+: publicações, palestras, parcerias de peso, prêmios ou histórico comprovado por fontes externas verificáveis.
Diagnosis deve apontar: se a autoridade é apenas autodeclarada ou se há reconhecimento externo real.
Recommendation deve focar em: PR, parcerias estratégicas, publicação em veículos do setor ou participação em eventos como palestrante.

### consistencia_narrativa
Avalie o alinhamento entre o que a marca diz, o que ela vende e como ela age na prática.
Score 80+: fio condutor claro ligando a história do fundador/marca à oferta atual, sem contradições entre canais ou mensagens.
Diagnosis deve apontar: onde está a quebra — entre a história e a oferta, entre canais, ou entre o tom e o produto.
Recommendation deve focar em: fechar a contradição específica identificada ou alinhar a comunicação de um canal à narrativa central.

### maturidade_editorial
Avalie a capacidade de produzir conteúdo estratégico de forma consistente e com propósito claro.
Score 80+: pilares de conteúdo definidos, frequência estabelecida, formatos validados e linha editorial coerente com o posicionamento.
Diagnosis deve apontar: se o conteúdo é esporádico, sem pauta, sem linha editorial ou desconectado da oferta.
Recommendation deve focar em: criação de linha editorial com 3 pilares, definição de frequência mínima ou reciclagem de conteúdo existente.

### objecoes
Avalie o mapeamento e a quebra ativa das resistências de compra do público.
Score 80+: objeções mapeadas por nível de consciência e ativamente rebatidas na comunicação (conteúdo, copy, FAQ, depoimentos).
Diagnosis deve apontar: quais objeções estão sem resposta na comunicação atual ou quais são tratadas de forma superficial.
Recommendation deve focar em: mapear as 3 principais objeções e criar um conteúdo ou peça de copy específica para cada uma.

### tom_de_voz
Avalie a personalidade e o vocabulário da marca — o que a torna reconhecível pelo estilo.
Score 80+: linguagem distinguível, vocabulário próprio e postura clara (ex: provocador, acolhedor, técnico, irreverente) aplicada de forma consistente.
Diagnosis deve apontar: se o tom é genérico, inconsistente entre canais ou intercambiável com qualquer concorrente.
Recommendation deve focar em: definir 3 adjetivos de voz, criar um glossário de expressões próprias ou estabelecer o que a marca nunca diria.

## Regras de Acionabilidade (OBRIGATÓRIAS)
- PROIBIDO usar: "alinhar estratégias", "potencializar resultados", "agregar valor", "fortalecer a marca", "melhorar a comunicação".
- O campo 'diagnosis' deve nomear exatamente onde está o buraco ou a força — com referência ao dado encontrado.
- O campo 'recommendation' deve começar com um verbo de ação no infinitivo e ser executável na próxima semana.
- Máximo 300 caracteres para diagnosis. Máximo 300 caracteres para recommendation.

IMPORTANTE: score baixo por AUSÊNCIA de dados ≠ fraqueza estratégica real.
Quando o score for baixo por falta de input, use maturity_level='dados_insuficientes'
e registre a ausência em data_coverage_note — não como gap crítico.
${stageGuidance}
${incrementalRule}
`.trim();
}

function buildOutputSchema(dimensions: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      reasoning: {
        type: "string",
        description: "Chain-of-thought ANTES dos scores. Explique sua leitura geral do contexto antes de avaliar.",
      },
      overall_score: { type: "number" },
      summary: { type: "string" },
      reasoning_json: {
        type: "object",
        additionalProperties: false,
        properties: {
          strategic_read:     { type: "string" },
          main_risks:         { type: "array", items: { type: "string" } },
          recommended_focus:  { type: "string" },
          data_coverage_note: { type: "string" },
          delta_impact:       { type: "string" },
        },
        required: ["strategic_read", "main_risks", "recommended_focus", "data_coverage_note", "delta_impact"],
      },
      diagnostics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            diagnostic_ref:  { type: "string" },
            dimension_key:   { type: "string", enum: dimensions },
            dimension_label: { type: "string" },
            score:           { type: "number" },
            maturity_level:  {
              type: "string",
              enum: ["dados_insuficientes", "inicial", "em_desenvolvimento", "consolidado", "exemplar"],
            },
            diagnosis:       { type: "string" },
            recommendation:  { type: "string" },
            confidence:      { type: "number" },
          },
          required: [
            "diagnostic_ref", "dimension_key", "dimension_label",
            "score", "maturity_level", "diagnosis", "recommendation", "confidence",
          ],
        },
      },
    },
    required: ["reasoning", "overall_score", "summary", "reasoning_json", "diagnostics"],
  };
}

// ─── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl        = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const openaiApiKey       = Deno.env.get("OPENAI_API_KEY")?.trim();
  const openaiModel        = Deno.env.get("OPENAI_STRATEGY_MODEL")?.trim() || "gpt-4.1-mini";

  if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
    return json({ error: "Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY" }, 500);
  }

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "Body JSON invalido" }, 400); }

  const userId = typeof body?.user_id === "string" ? body.user_id.trim() : "";
  const force  = body?.force === true;
  if (!userId) return json({ error: "user_id e obrigatorio" }, 400);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Verificar se já existe assessment ativo e não-stale
    const existingRes = await supabase
      .from("strategic_assessments")
      .select("id, status, pipeline_phase, generated_at, knowledge_snapshot_at, overall_score, reasoning_json")
      .eq("user_id", userId)
      .in("status", ["active", "stale"])
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRes.error) throw new Error(existingRes.error.message);
    const lastAssessment = existingRes.data;
    const snapshotAt: string | null = lastAssessment?.knowledge_snapshot_at ?? null;

    // Guardar pipeline em andamento — não reiniciar
    if (!force && lastAssessment && lastAssessment.pipeline_phase &&
        ["phase1_running", "phase2_pending", "phase2_running", "phase3_pending", "phase3_running"].includes(lastAssessment.pipeline_phase)) {
      return json({ success: true, skipped: true, reason: "pipeline_in_progress", phase: lastAssessment.pipeline_phase });
    }

    if (!force && lastAssessment && lastAssessment.status === "active") {
      const lastKnowledge = await supabase
        .from("brand_knowledge")
        .select("updated_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const knowledgeUpdatedAt = lastKnowledge.data?.updated_at ?? null;
      const isStale = knowledgeUpdatedAt && knowledgeUpdatedAt > lastAssessment.generated_at;
      if (!isStale) {
        return json({ success: true, skipped: true, stale: false, assessment_id: lastAssessment.id });
      }
    }

    // 2. Carregar contexto
    const ctx = await getSourceContext(supabase, userId, force ? null : snapshotAt);

    const hasUsefulData = ctx.brandKnowledgeDelta.length > 0 ||
      ctx.brandContextResponsesAll.length > 0 ||
      ctx.memoryNotesDelta.length > 0;

    if (!hasUsefulData) {
      await supabase.from("strategic_assessments").insert({
        user_id: userId, status: "error", pipeline_phase: "error",
        summary: "Sem dados suficientes para diagnostico.",
        reasoning_json: { reason: "empty_context" },
        error_msg: "Nenhuma fonte de conhecimento encontrada.",
      });
      return json({ success: false, error: "Sem dados suficientes" }, 422);
    }

    // 3. Arquivar assessment anterior e criar novo cabeçalho
    const archived = await supabase.rpc("archive_previous_assessment_data", { p_user_id: userId });
    if (archived.error) throw new Error(`archive: ${archived.error.message}`);

    const assessmentInsert = await supabase
      .from("strategic_assessments")
      .insert({
        user_id:               userId,
        status:                "active",
        pipeline_phase:        "phase1_running",
        overall_score:         null,
        summary:               null,
        reasoning_json:        {},
        generated_at:          new Date().toISOString(),
        knowledge_snapshot_at: ctx.knowledge_snapshot_at ?? new Date().toISOString(),
      })
      .select()
      .single();
    if (assessmentInsert.error) throw new Error(assessmentInsert.error.message);
    const assessment = assessmentInsert.data;

    // 4. Chamar OpenAI — foco exclusivo em diagnóstico especializado por dimensão
    const systemPrompt = buildSystemPrompt(
      ctx.userProfile?.business_stage ?? null,
      ctx.is_first_assessment,
      ctx.activeDimensions,
    );
    const outputSchema = buildOutputSchema(ctx.activeDimensions);

    const aiPayload = {
      user_id:    userId,
      dimensions: ctx.activeDimensions,
      user_context: ctx.userProfile ? {
        business_stage:            ctx.userProfile.business_stage,
        weekly_content_frequency:  ctx.userProfile.weekly_content_frequency,
        priority_channels:         ctx.userProfile.priority_channels,
        client_maturity:           ctx.userProfile.client_maturity,
        main_marketing_difficulty: ctx.userProfile.main_marketing_difficulty,
        market_niche:              ctx.userProfile.market_niche,
        modalidade:                ctx.userProfile.modalidade,
      } : null,
      anchor: (!ctx.is_first_assessment && lastAssessment) ? {
        previous_score:    lastAssessment.overall_score,
        strategic_read:    lastAssessment.reasoning_json?.strategic_read ?? null,
        recommended_focus: lastAssessment.reasoning_json?.recommended_focus ?? null,
      } : null,
      delta: {
        is_first_assessment: ctx.is_first_assessment,
        snapshot_at: snapshotAt,
        new_knowledge: ctx.brandKnowledgeDelta.map((k: any) => ({
          item_key:     k.item_key,
          item_group:   k.item_group,
          value_text:   k.value_text,
          confidence:   k.confidence,
          is_canonical: k.is_canonical,
        })),
        new_responses: ctx.brandContextDelta.map((r: any) => ({
          field_key:   r.field_key,
          value_text:  r.value_text,
          answer_type: r.answer_type,
        })),
        new_notes: ctx.memoryNotesDelta.map((n: any) => ({
          note_content: n.note_content,
          context_type: n.context_type,
        })),
        new_links: ctx.knowledgeLinksDelta.map((l: any) => ({
          relation_type:  l.relation_type,
          strength:       l.strength,
          relation_label: l.relation_label,
        })),
      },
    };

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model:             openaiModel,
        temperature:       0.3,
        max_output_tokens: 4000,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: JSON.stringify(aiPayload) },
        ],
        text: {
          format: {
            type:   "json_schema",
            name:   "strategy_phase1_diagnostics",
            strict: true,
            schema: outputSchema,
          },
        },
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI ${openaiResponse.status}: ${await openaiResponse.text()}`);
    }

    const openaiData = await openaiResponse.json();
    const outputText = extractOutputText(openaiData);
    if (!outputText) throw new Error("A IA nao retornou conteudo valido");
    const parsed = JSON.parse(outputText);

    // 5. Inserir diagnósticos
    const diagnostics = Array.isArray(parsed.diagnostics) ? parsed.diagnostics.slice(0, 15) : [];
    if (diagnostics.length > 0) {
      const payload = diagnostics.map((item: any) => ({
        assessment_id:   assessment.id,
        user_id:         userId,
        dimension_key:   ctx.activeDimensions.includes(item.dimension_key) ? item.dimension_key : ctx.activeDimensions[0],
        dimension_label: cleanText(item.dimension_label, 160),
        score:           clamp(item.score, 0, 100, null),
        maturity_level:  ALLOWED_MATURITY_LEVELS.has(cleanLowerToken(item.maturity_level)) ? cleanLowerToken(item.maturity_level) : "inicial",
        diagnosis:       cleanText(item.diagnosis, 400),
        recommendation:  cleanText(item.recommendation, 400),
        confidence:      clamp(item.confidence, 0, 1, null),
        status:          "active",
      }));
      const inserted = await supabase.from("strategic_diagnostics").insert(payload);
      if (inserted.error) throw new Error(`strategic_diagnostics: ${inserted.error.message}`);
    }

    // 6. Atualizar cabeçalho com score/summary e avançar para phase2_pending (dispara trigger)
    const updateRes = await supabase
      .from("strategic_assessments")
      .update({
        overall_score:  clamp(parsed.overall_score, 0, 100, null),
        summary:        cleanText(parsed.summary, 3000),
        reasoning_json: {
          strategic_read:     cleanText(parsed.reasoning_json?.strategic_read, 1000),
          main_risks:         Array.isArray(parsed.reasoning_json?.main_risks) ? parsed.reasoning_json.main_risks.slice(0, 5) : [],
          recommended_focus:  cleanText(parsed.reasoning_json?.recommended_focus, 500),
          data_coverage_note: cleanText(parsed.reasoning_json?.data_coverage_note, 500),
          delta_impact:       cleanText(parsed.reasoning_json?.delta_impact, 500),
        },
        pipeline_phase:       "phase2_pending",   // ← dispara trigger → phase2
        phase1_completed_at:  new Date().toISOString(),
      })
      .eq("id", assessment.id);
    if (updateRes.error) throw new Error(`update assessment: ${updateRes.error.message}`);

    return json({
      success:              true,
      assessment_id:        assessment.id,
      pipeline_phase:       "phase2_pending",
      dimensions_evaluated: diagnostics.length,
      overall_score:        clamp(parsed.overall_score, 0, 100, null),
      is_first_assessment:  ctx.is_first_assessment,
      delta_items: {
        knowledge: ctx.brandKnowledgeDelta.length,
        responses: ctx.brandContextDelta.length,
        notes:     ctx.memoryNotesDelta.length,
        links:     ctx.knowledgeLinksDelta.length,
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[phase1] error:", message);
    try {
      await supabase.from("strategic_assessments")
        .insert({
          user_id: userId, status: "error", pipeline_phase: "error",
          summary: "Falha na Phase 1 (diagnostics).",
          reasoning_json: { error: message }, error_msg: message,
        });
    } catch (e) { console.error("Failed to persist error", e); }
    return json({ error: message }, 500);
  }
});
