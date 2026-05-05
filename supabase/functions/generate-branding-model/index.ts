import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL_KEYS = [
  "posicionamento",
  "proposta_valor",
  "promessa",
  "proposito",
  "pilares_marca",
  "temas_conteudo",
  "territorios_narrativos",
] as const;
type ModelKey = typeof MODEL_KEYS[number];

// Modelos base que determinam completude da plataforma
const BASE_MODELS: ModelKey[] = ["posicionamento", "proposta_valor", "promessa", "proposito"];

const SCHEMAS: Record<ModelKey, Record<string, string>> = {
  posicionamento: {
    statement: "",
    publico: "",
    problema_central: "",
    diferenciacao: "",
    crenca: "",
    essencia: "",
  },
  proposta_valor: {
    statement: "",
    oferta: "",
    problema_que_resolve: "",
    beneficio_principal: "",
    capacidade_real: "",
    transformacao: "",
  },
  promessa: {
    statement: "",
    dor_atual: "",
    resultado_esperado: "",
    mudanca_prometida: "",
    limite_da_promessa: "",
  },
  proposito: {
    statement: "",
    crenca_central: "",
    problema_maior: "",
    impacto_que_busca: "",
    razao_de_existir: "",
  },
  pilares_marca: {
    statement: "",
    pilar_1: "",
    pilar_2: "",
    pilar_3: "",
    pilar_4: "",
    pilar_5: "",
    logica_dos_pilares: "",
  },
  temas_conteudo: {
    statement: "",
    tema_1: "",
    tema_2: "",
    tema_3: "",
    tema_4: "",
    tema_5: "",
    tema_6: "",
    formatos_indicados: "",
    frequencia_sugerida: "",
  },
  territorios_narrativos: {
    statement: "",
    narrativa_de_origem: "",
    narrativa_de_transformacao: "",
    narrativa_de_conflito: "",
    narrativa_de_prova: "",
    narrativa_de_visao: "",
    voz_narrativa: "",
  },
};

const PRIORITY_ITEMS: Record<ModelKey, string[]> = {
  posicionamento: ["negocio.oferta_central","negocio.diferenciacao_principal","pessoas.publico_prioritario","pessoas.dor_principal","comunicacao.crenca_central"],
  proposta_valor: ["negocio.oferta_central","negocio.problema_que_resolve","negocio.capacidade_real","pessoas.desejo_principal","pessoas.dor_principal"],
  promessa: ["pessoas.dor_principal","pessoas.desejo_principal","negocio.capacidade_real","negocio.limites_atuacao"],
  proposito: ["comunicacao.crenca_central","negocio.problema_que_resolve","identidade.momento_atual","comunicacao.tese_principal"],
  pilares_marca: ["negocio.oferta_central","negocio.problema_que_resolve","negocio.diferenciacao_principal","pessoas.dor_principal","comunicacao.crenca_central","comunicacao.editorial","comunicacao.tom_de_voz"],
  temas_conteudo: ["comunicacao.editorial","negocio.oferta_central","negocio.problema_que_resolve","pessoas.dor_principal","pessoas.publico_prioritario","negocio.prova"],
  territorios_narrativos: ["comunicacao.crenca_central","comunicacao.narrativa","pessoas.dor_principal","negocio.capacidade_real","negocio.prova","negocio.problema_que_resolve"],
};

// MELHORADO: Cada modelo tem uma instrução cirúrgica de formato,
// focada em gerar textos curtos, estratégicos e acionáveis.
const CONCEPT_PROMPTS: Record<ModelKey, string> = {
  posicionamento: `
O POSICIONAMENTO define onde a marca ocupa espaço na mente do cliente.

Formato obrigatório do branding_concept — Positioning Statement:
"Para [público específico], somos a única [categoria] que [diferencial concreto] porque [prova ou crença]."

Regras:
- Use exatamente esse formato, adaptando para o contexto real da marca
- O diferencial deve ser concreto e verificável — não use "inovador" ou "único"
- A prova ou crença deve ser a razão genuína pela qual a marca pode fazer essa afirmação
- Resultado: 1 frase de 20 a 30 palavras, pronta para ser usada como tagline ou bio
`.trim(),

  proposta_valor: `
A PROPOSTA DE VALOR responde diretamente: "por que eu deveria escolher essa marca?"

Formato obrigatório do branding_concept — Elevator Pitch:
"Ajudamos [público] a [resultado desejado e concreto] através de [oferta/mecanismo], para que [transformação final na vida do cliente]."

Regras:
- Foco total no cliente — o que ele GANHA, não o que a marca FAZ
- O resultado e a transformação devem ser específicos e mensuráveis quando possível
- Resultado: 1 a 2 frases de 25 a 35 palavras, pronta para hero section ou argumento de venda
`.trim(),

  promessa: `
A PROMESSA é o compromisso inegociável que a marca faz com cada cliente.

Formato obrigatório do branding_concept — Garantia:
"[Verbo de ação forte]: [o que o cliente sempre recebe]. [Limite claro: o que está fora do escopo]."

Exemplos de tom: "Entregamos X sem Y. Nunca Z."
Regras:
- Use verbos de ação no presente: "Entregamos", "Garantimos", "Asseguramos"
- O limite torna a promessa mais crível — não omita
- PROIBIDO começar com "Nós acreditamos" ou "Nossa missão é"
- Resultado: 2 frases curtas, máximo 30 palavras, tom direto e seguro
`.trim(),

  proposito: `
O PROPÓSITO é a causa que a marca defende — a mudança que quer ver no mundo.

Formato obrigatório do branding_concept — Causa:
"[Problema maior que a marca combate]. [A crença central que guia tudo]. [A mudança que a marca quer provocar]."

Regras:
- Identifique o "inimigo em comum" — o que está errado no mercado/mundo que a marca quer corrigir
- A crença deve ser uma convicção, não uma aspiração genérica
- Tom: inspirador, direto, sem corporativês
- PROIBIDO: "Nossa missão é", "Acreditamos em um mundo onde", "Somos apaixonados por"
- Resultado: 2 a 3 frases curtas, máximo 35 palavras
`.trim(),

  pilares_marca: `
OS PILARES DE MARCA são os eixos temáticos que sustentam toda a comunicação.

Formato obrigatório do branding_concept — Fundação Editorial:
"[Nome da marca] se posiciona na intersecção entre [Pilar 1], [Pilar 2] e [Pilar 3]. [Frase que explica como esses eixos se complementam e criam uma perspectiva única]."

Regras:
- Cite os pilares pelos nomes reais gerados no output_json
- A segunda frase deve explicar a LÓGICA do conjunto — por que esses pilares juntos são únicos para essa marca
- Resultado: 2 frases, máximo 40 palavras, funciona como briefing editorial para um social media
`.trim(),

  temas_conteudo: `
OS TEMAS DE CONTEÚDO são os assuntos sobre os quais a marca tem autoridade genuína.

Formato obrigatório do branding_concept — Linha Editorial:
"[Nome da marca] domina as conversas sobre [tema 1], [tema 2] e [tema 3] — sempre sob a ótica de [perspectiva ou crença central]. [Frase sobre o formato ou frequência dominante]."

Regras:
- Cite os temas reais do output_json, não invente
- A perspectiva deve ser o ângulo único da marca — o que a diferencia de qualquer outro criador de conteúdo no mesmo nicho
- Resultado: 2 frases, máximo 40 palavras, funciona como guia de pauta para ghostwriter ou social media
`.trim(),

  territorios_narrativos: `
OS TERRITÓRIOS NARRATIVOS definem COMO a marca conta histórias — os arcos e o ponto de vista dominante.

Formato obrigatório do branding_concept — Voz e Estilo:
"[Nome da marca] conta histórias de [tipo de arco narrativo dominante], usando um tom [adjetivo de voz] e [adjetivo de voz]. [Frase sobre o enquadramento: qual é o ângulo pelo qual a marca enxerga o mundo e o comunica]."

Regras:
- O tipo de arco deve vir das narrativas reais do output_json (origem, transformação, conflito, prova, visão)
- Os adjetivos de voz devem ser específicos e opostos ao genérico (ex: "provocativo e técnico", não "autêntico e inspirador")
- Resultado: 2 frases, máximo 40 palavras, funciona como guia de tom para qualquer formato de conteúdo
`.trim(),
};

// MELHORADO: Regras gerais reescritas para priorizar concisão e acionabilidade
function buildUnifiedPrompt(model_key: ModelKey): string {
  const schema = SCHEMAS[model_key];
  const priorities = PRIORITY_ITEMS[model_key];
  const conceptGuidance = CONCEPT_PROMPTS[model_key];

  return `
Você é uma IA interna do backend do Planto — sistema de inteligência de marca.

Sua tarefa é ler os itens de brand_knowledge fornecidos e:
1. Preencher o output_json do modelo '${model_key}'
2. Escrever o branding_concept — texto estratégico e acionável da marca

## Regras de preenchimento do output_json
- Use APENAS os dados presentes nos knowledge_items — nunca invente informações
- Se um campo não tiver base nos dados, deixe como string vazia ""
- O campo "statement" deve ser uma síntese curta e estratégica (máximo 2 linhas)
- Priorize os itens com estes item_keys:
${priorities.map(p => `  • ${p}`).join("\n")}

## Schema — output_json deve ter exatamente estes campos:
${JSON.stringify(schema, null, 2)}

## Instrução específica para o branding_concept de '${model_key}'
${conceptGuidance}

## Regras ABSOLUTAS de escrita do branding_concept
- SEJA EXTREMAMENTE CONCISO: Máximo absoluto de 2 a 3 frases curtas (limite de 35 palavras no total).
- VÁ DIRETO AO PONTO: NUNCA comece com "Na [marca], nós acreditamos que...", "Nós somos...", "Nossa missão é..." ou qualquer variação. Comece com a ação, o problema ou a transformação.
- TOM ESTRATÉGICO E ACIONÁVEL: O texto deve ser tão preciso que poderia ser usado imediatamente como a Bio do Instagram ou o H1 do site, sem edição.
- ZERO ENCHEÇÃO: Proibido usar adjetivos vazios ("inovador", "excelência", "comprometidos", "apaixonados", "soluções"). Use verbos fortes e substantivos concretos.
- Um único bloco de texto — sem listas, sem subtítulos, sem bullets.
- Fundamente apenas no output_json gerado — não adicione informações externas.

## Saída obrigatória — retorne APENAS JSON, sem texto fora do JSON:
{
  "user_id": "<uuid do usuário>",
  "model_key": "${model_key}",
  "schema_version": "v1",
  "input_item_keys": ["lista dos item_keys efetivamente usados"],
  "output_json": { <campos do schema acima preenchidos> },
  "branding_concept": "<texto conciso e estratégico aqui — máximo 35 palavras>"
}
`.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const { user_id, model_key } = await req.json();

    if (!user_id || !model_key) {
      return new Response(
        JSON.stringify({ error: "user_id e model_key são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!MODEL_KEYS.includes(model_key as ModelKey)) {
      return new Response(
        JSON.stringify({ error: `model_key inválido. Use: ${MODEL_KEYS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: knowledgeItems, error: knowledgeError } = await supabase
      .from("brand_knowledge")
      .select("id, item_key, item_group, item_kind, value_text, value_json, truth_type, confidence, is_canonical")
      .eq("user_id", user_id)
      .eq("status", "active");

    if (knowledgeError) {
      return new Response(
        JSON.stringify({ error: knowledgeError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!knowledgeItems || knowledgeItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum item ativo encontrado em brand_knowledge" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const typedKey = model_key as ModelKey;

    // Uma única chamada ao gpt-4o gerando output_json + branding_concept
    const unifiedResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        input: [
          { role: "system", content: buildUnifiedPrompt(typedKey) },
          { role: "user", content: JSON.stringify({ user_id, model_key, knowledge_items: knowledgeItems }) },
        ],
        text: { format: { type: "json_object" } },
      }),
    });

    if (!unifiedResponse.ok) {
      const err = await unifiedResponse.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${err}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const unifiedData = await unifiedResponse.json();
    const unifiedText = unifiedData.output?.[0]?.content?.[0]?.text;
    if (!unifiedText) {
      return new Response(
        JSON.stringify({ error: "IA não retornou output válido", raw: unifiedData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const parsedUnified = JSON.parse(unifiedText);

    // Mapear input_item_keys → input_item_ids
    const keyToId = Object.fromEntries(knowledgeItems.map((k: any) => [k.item_key, k.id]));
    const inputItemIds: string[] = (parsedUnified.input_item_keys ?? []).flatMap((key: string) =>
      keyToId[key] ? [keyToId[key]] : []
    );

    // Arquivar versão ativa anterior
    const { error: archiveError } = await supabase
      .from("plataforma_marca")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .eq("model_key", model_key)
      .eq("status", "active");

    if (archiveError) {
      return new Response(
        JSON.stringify({ error: archiveError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Inserir novo registro
    const { data: inserted, error: insertError } = await supabase
      .from("plataforma_marca")
      .insert({
        user_id: parsedUnified.user_id,
        model_key: parsedUnified.model_key,
        schema_version: parsedUnified.schema_version ?? "v1",
        input_item_ids: inputItemIds,
        output_json: parsedUnified.output_json ?? {},
        branding_concept: parsedUnified.branding_concept ?? "",
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Se modelo base foi gerado, verificar se todos os 4 estão completos
    // e disparar a fase 1 do pipeline estratégico com force=true.
    let strategyPipelineTriggered = false;
    if (BASE_MODELS.includes(typedKey)) {
      try {
        const { data: activeModels } = await supabase
          .from("plataforma_marca")
          .select("model_key")
          .eq("user_id", user_id)
          .eq("status", "active")
          .in("model_key", BASE_MODELS);

        const completedBaseModels = (activeModels ?? []).map((m: any) => m.model_key);
        const allBaseComplete = BASE_MODELS.every(k => completedBaseModels.includes(k));

        if (allBaseComplete) {
          fetch(`${supabaseUrl}/functions/v1/strategy-phase1-diagnostics`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader || `Bearer ${supabaseServiceKey}`,
              apikey: supabaseServiceKey,
            },
            body: JSON.stringify({ user_id, force: true }),
          }).catch(() => {});
          strategyPipelineTriggered = true;
        }
      } catch (evalErr) {
        console.error("strategy pipeline trigger failed", evalErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        model: inserted,
        strategy_pipeline_triggered: strategyPipelineTriggered,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
