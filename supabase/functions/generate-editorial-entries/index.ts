import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface EditorialEntry {
  assessment_id: string;
  content: string;
  topic: string;
  suggested_platforms: string[];
  tone: string;
  content_type: string;
}

interface BrandContext {
  user_id: string;
  brand_knowledge: Array<{
    id: string;
    content: string;
    form_type: string;
  }>;
  user_profile: {
    name: string;
    business_stage: string;
    market_niche: string;
    main_services: string;
    ideal_client: string;
    priority_channels: string[];
  };
  recent_assessments: Array<{
    id: string;
    assessment_json: Record<string, unknown>;
  }>;
}

async function generateEditorialContent(
  brandContext: BrandContext,
  assessmentId: string,
  openaiApiKey: string
): Promise<EditorialEntry[]> {
  const prompt = buildPrompt(brandContext, assessmentId);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em estratégia de conteúdo e branding.
Seu objetivo é gerar sugestões de conteúdo editorial baseado na análise estratégica da marca.
Cada entrada deve ser uma linha editorial clara, acionável e alinhada com os objetivos estratégicos.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  // Parse a resposta JSON da OpenAI
  const entries = parseEditorialEntries(content, assessmentId);
  return entries;
}

function buildPrompt(brandContext: BrandContext, assessmentId: string): string {
  const { brand_knowledge, user_profile, recent_assessments } = brandContext;

  const knowledgeContext = brand_knowledge
    .map((k) => `- ${k.form_type}: ${k.content}`)
    .join("\n");

  const profileContext = `
Marca: ${user_profile.name}
Nicho: ${user_profile.market_niche}
Estágio: ${user_profile.business_stage}
Serviços: ${user_profile.main_services}
Cliente Ideal: ${user_profile.ideal_client}
Canais Prioritários: ${user_profile.priority_channels?.join(", ") || "Não definido"}
`;

  const assessmentSummary = recent_assessments[0]?.assessment_json
    ? JSON.stringify(recent_assessments[0].assessment_json, null, 2)
    : "Sem dados anteriores";

  return `
Com base na análise estratégica da marca, gere 7-10 LINHAS EDITORIAIS (tópicos/ideias de conteúdo) para o calendário futuro.

CONTEXTO DA MARCA:
${profileContext}

CONHECIMENTOS CHAVE:
${knowledgeContext}

ANÁLISE ESTRATÉGICA MAIS RECENTE:
${assessmentSummary}

INSTRUÇÕES:
1. Retorne um JSON array com objetos tendo: topic, content (breve descrição), suggested_platforms (array de canais), tone (tom de voz), content_type (blog/video/social/infografic/etc)
2. Cada entrada deve ser acionável - pronta pra criar um calendário
3. Respeite os canais prioritários da marca
4. Alinha-se com a estratégia identificada
5. Varie tipos de conteúdo

Retorne APENAS o JSON array, sem markdown ou explicações adicionais.
Exemplo de formato:
[
  {
    "topic": "Como escolher ferramentas de produtividade",
    "content": "Guia prático sobre seleção de ferramentas...",
    "suggested_platforms": ["blog", "linkedin"],
    "tone": "Educativo e técnico",
    "content_type": "blog"
  }
]`;
}

function parseEditorialEntries(
  response: string,
  assessmentId: string
): EditorialEntry[] {
  try {
    // Tenta fazer parse do JSON diretamente
    const parsed = JSON.parse(response);

    // Valida e formata
    const entries = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.entries)
        ? parsed.entries
        : [parsed];

    return entries
      .map((entry: Record<string, unknown>) => ({
        assessment_id: assessmentId,
        topic: String(entry.topic || ""),
        content: String(entry.content || ""),
        suggested_platforms: Array.isArray(entry.suggested_platforms)
          ? entry.suggested_platforms.map(String)
          : [],
        tone: String(entry.tone || "Profissional"),
        content_type: String(entry.content_type || "social"),
      }))
      .filter((e) => e.topic && e.content);
  } catch (error) {
    console.error("Failed to parse OpenAI response:", response);
    throw new Error(`Invalid editorial entries format: ${error}`);
  }
}

async function processQueue(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string
) {
  // Busca jobs pendentes
  const { data: queueItems, error: queueError } = await supabase
    .from("editorial_generation_queue")
    .select("id, assessment_id")
    .eq("status", "pending")
    .limit(5);

  if (queueError) {
    throw new Error(`Failed to fetch queue: ${queueError.message}`);
  }

  if (!queueItems || queueItems.length === 0) {
    console.log("No pending editorial generation tasks");
    return { processed: 0, success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const queueItem of queueItems) {
    try {
      // Marca como processando
      await supabase
        .from("editorial_generation_queue")
        .update({ status: "processing" })
        .eq("id", queueItem.id);

      // Busca assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from("strategic_assessments")
        .select("id, user_id")
        .eq("id", queueItem.assessment_id)
        .single();

      if (assessmentError || !assessment) {
        throw new Error(
          `Assessment not found: ${assessmentError?.message || "Unknown error"}`
        );
      }

      // Busca contexto da marca via função PostgreSQL
      const { data: brandContext, error: contextError } = await supabase.rpc(
        "get_brand_context_for_editorial",
        { user_id_param: assessment.user_id }
      );

      if (contextError || !brandContext) {
        throw new Error(
          `Failed to get brand context: ${contextError?.message || "Unknown error"}`
        );
      }

      // Gera conteúdo editorial via OpenAI
      const editorialEntries = await generateEditorialContent(
        brandContext,
        queueItem.assessment_id,
        openaiApiKey
      );

      // Insere em editorial_system
      if (editorialEntries.length > 0) {
        const { error: insertError } = await supabase
          .from("editorial_system")
          .insert(
            editorialEntries.map((entry) => ({
              assessment_id: entry.assessment_id,
              topic: entry.topic,
              content: entry.content,
              suggested_platforms: entry.suggested_platforms,
              tone: entry.tone,
              content_type: entry.content_type,
              user_id: assessment.user_id,
              status: "active",
            }))
          );

        if (insertError) {
          throw new Error(
            `Failed to insert editorial entries: ${insertError.message}`
          );
        }
      }

      // Marca como completo
      await supabase.rpc("mark_editorial_generated", {
        assessment_id: queueItem.assessment_id,
        success: true,
      });

      success++;
      console.log(`✅ Generated ${editorialEntries.length} entries for assessment ${queueItem.assessment_id}`);
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Failed to generate editorial for ${queueItem.assessment_id}: ${errorMsg}`
      );

      // Marca como falha
      await supabase.rpc("mark_editorial_generated", {
        assessment_id: queueItem.assessment_id,
        success: false,
        error_msg: errorMsg,
      });
    }
  }

  return {
    processed: queueItems.length,
    success,
    failed,
  };
}

Deno.serve(async (req) => {
  try {
    // Validação básica de token (opcional)
    const authHeader = req.headers.get("Authorization");
    const expectedToken = Deno.env.get("EDITORIAL_GENERATION_TOKEN");

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Busca variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing required environment variables",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Cria cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Processa fila
    const result = await processQueue(supabase, openaiApiKey);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processados ${result.processed} jobs: ${result.success} sucesso, ${result.failed} falhas`,
        result,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Fatal error in editorial generation:", errorMsg);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
