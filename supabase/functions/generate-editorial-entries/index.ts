import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Corrigido: campos alinhados com as colunas reais da tabela editorial_system
interface EditorialEntry {
  title: string;
  core_message: string;
  format: string;
  audience_moment: string;
  cta_type: string;
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
  // Corrigido: campo real é reasoning_json, não assessment_json
  recent_assessments: Array<{
    id: string;
    reasoning_json: Record<string, unknown>;
  }>;
}

async function generateEditorialContent(
  brandContext: BrandContext,
  openaiApiKey: string
): Promise<EditorialEntry[]> {
  const prompt = buildPrompt(brandContext);

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
Seu objetivo é gerar linhas editoriais baseadas na análise estratégica da marca.
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

  return parseEditorialEntries(content);
}

function buildPrompt(brandContext: BrandContext): string {
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

  // Corrigido: campo real é reasoning_json, não assessment_json
  const assessmentSummary = recent_assessments[0]?.reasoning_json
    ? JSON.stringify(recent_assessments[0].reasoning_json, null, 2)
    : "Sem dados anteriores";

  return `
Com base na análise estratégica da marca, gere 7-10 LINHAS EDITORIAIS para o calendário de conteúdo.

CONTEXTO DA MARCA:
${profileContext}

CONHECIMENTOS CHAVE:
${knowledgeContext}

ANÁLISE ESTRATÉGICA MAIS RECENTE:
${assessmentSummary}

INSTRUÇÕES:
1. Retorne um JSON array com objetos tendo os campos:
   - title: título da linha editorial
   - core_message: mensagem central ou breve descrição do conteúdo
   - format: formato do conteúdo (blog/video/social/infografico/etc)
   - audience_moment: momento da jornada do público (ex: descoberta, consideração, decisão)
   - cta_type: tipo de chamada para ação (ex: engajamento, captura, conversao)
2. Cada entrada deve ser acionável — pronta para criar um calendário
3. Respeite os canais prioritários da marca
4. Alinhe-se com a estratégia identificada
5. Varie os formatos de conteúdo

Retorne APENAS o JSON array, sem markdown ou explicações adicionais.
Exemplo de formato:
[
  {
    "title": "Como escolher ferramentas de produtividade",
    "core_message": "Guia prático sobre seleção de ferramentas para profissionais...",
    "format": "blog",
    "audience_moment": "consideração",
    "cta_type": "engajamento"
  }
]`;
}

function parseEditorialEntries(response: string): EditorialEntry[] {
  try {
    const parsed = JSON.parse(response);

    const entries = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.entries)
        ? parsed.entries
        : [parsed];

    return entries
      .map((entry: Record<string, unknown>) => ({
        title: String(entry.title || ""),
        core_message: String(entry.core_message || ""),
        format: String(entry.format || "social"),
        audience_moment: String(entry.audience_moment || ""),
        cta_type: String(entry.cta_type || "engajamento"),
      }))
      .filter((e) => e.title && e.core_message);
  } catch (error) {
    console.error("Failed to parse OpenAI response:", response);
    throw new Error(`Invalid editorial entries format: ${error}`);
  }
}

async function processForAssessment(
  supabase: ReturnType<typeof createClient>,
  assessmentId: string,
  openaiApiKey: string
) {
  // Busca assessment e user_id
  const { data: assessment, error: assessmentError } = await supabase
    .from("strategic_assessments")
    .select("id, user_id")
    .eq("id", assessmentId)
    .single();

  if (assessmentError || !assessment) {
    throw new Error(
      `Assessment not found: ${assessmentError?.message || "Unknown error"}`
    );
  }

  // Busca contexto da marca via função RPC existente no banco
  const { data: brandContext, error: contextError } = await supabase.rpc(
    "get_strategic_context",
    { p_user_id: assessment.user_id }
  );

  if (contextError || !brandContext) {
    throw new Error(
      `Failed to get brand context: ${contextError?.message || "Unknown error"}`
    );
  }

  // Gera conteúdo editorial via OpenAI
  const editorialEntries = await generateEditorialContent(
    brandContext as BrandContext,
    openaiApiKey
  );

  // Insere em editorial_system com os campos corretos da tabela
  if (editorialEntries.length > 0) {
    const { error: insertError } = await supabase
      .from("editorial_system")
      .insert(
        editorialEntries.map((entry) => ({
          // Corrigido: assessment_id não existe em editorial_system — removido
          user_id: assessment.user_id,
          title: entry.title,
          core_message: entry.core_message,
          format: entry.format,
          audience_moment: entry.audience_moment,
          cta_type: entry.cta_type,
          status: "active",
        }))
      );

    if (insertError) {
      throw new Error(
        `Failed to insert editorial entries: ${insertError.message}`
      );
    }
  }

  return editorialEntries.length;
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

    // Corrigido: a tabela editorial_generation_queue não existe no banco.
    // O assessment_id é recebido diretamente no body da requisição.
    const body = await req.json().catch(() => ({}));
    const assessmentId = body?.assessment_id as string | undefined;

    if (!assessmentId) {
      return new Response(
        JSON.stringify({ error: "assessment_id é obrigatório no body da requisição." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const generatedCount = await processForAssessment(supabase, assessmentId, openaiApiKey);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Geradas ${generatedCount} linhas editoriais para o assessment ${assessmentId}`,
        generated: generatedCount,
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
