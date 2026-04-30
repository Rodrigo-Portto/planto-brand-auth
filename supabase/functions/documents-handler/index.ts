import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";


const ALLOWED_BRAND_KNOWLEDGE_STATUSES = new Set(["active", "archived"]);

const ALLOWED_NOTE_CONTEXT_TYPES = new Set([
  "nota_usuario",
  "insight_agente",
  "decisao_estrategica",
  "observacao_mercado",
  "feedback_cliente",
]);
const EDITORIAL_LINE_FIELDS = [
  "title",
  "tension",
  "objective",
  "core_message",
  "primary_metric",
  "format",
  "audience_moment",
  "estrategic_role",
  "proof_type",
  "cta_type",
] as const;
const PROFILE_FIELDS = [
  "name",
  "surname",
  "email",
  "phone",
  "address",
  "website",
  "instagram",
  "market_niche",
  "education",
  "specialties",
  "avatar_url",
  "modalidade",
  "business_stage",
  "main_services",
  "ideal_client",
  "client_maturity",
  "priority_channels",
  "weekly_content_frequency",
  "main_marketing_difficulty",
] as const;
const KNOWLEDGE_ACTIONS = [
  "health",
  "ping",
  "get_knowledge_context",
  "knowledge_context",
  "get_brand_knowledge",
  "list_brand_knowledge",
  "read_brand_knowledge",
  "list_attachments",
  "read_attachments",
  "attachments",
  "save_memory_note",
  "memory_note",
  "note",
  "save_entry",
  "update_memory_note",
  "update_profile",
  "semantic_search",
] as const;
const STRATEGY_ACTIONS = [
  "health",
  "ping",
  "get_strategy_context",
  "strategy_context",
  "answer_strategic_question",
] as const;
const EXECUTION_ACTIONS = [
  "health",
  "ping",
  "get_execution_context",
  "execution_context",
] as const;

// Mapa canônico das 28 perguntas do briefing
const BRIEFING_QUESTIONS: { question_order: number; field_key: string; form_type: string }[] = [
  { question_order: 1,  field_key: "identidade.nome_marca",              form_type: "identidade" },
  { question_order: 2,  field_key: "identidade.area_atuacao",            form_type: "identidade" },
  { question_order: 3,  field_key: "identidade.especialidades",          form_type: "identidade" },
  { question_order: 4,  field_key: "identidade.momento_atual",           form_type: "identidade" },
  { question_order: 5,  field_key: "negocio.oferta_central",             form_type: "negocio" },
  { question_order: 6,  field_key: "negocio.problema_que_resolve",       form_type: "negocio" },
  { question_order: 7,  field_key: "negocio.capacidade_real",            form_type: "negocio" },
  { question_order: 8,  field_key: "negocio.diferenciacao_principal",    form_type: "negocio" },
  { question_order: 9,  field_key: "negocio.limites_atuacao",            form_type: "negocio" },
  { question_order: 10, field_key: "negocio.formato_entrega",            form_type: "negocio" },
  { question_order: 11, field_key: "pessoas.publico_prioritario",        form_type: "pessoas" },
  { question_order: 12, field_key: "pessoas.nivel_maturidade_publico",   form_type: "pessoas" },
  { question_order: 13, field_key: "pessoas.dor_principal",              form_type: "pessoas" },
  { question_order: 14, field_key: "pessoas.dores_secundarias",          form_type: "pessoas" },
  { question_order: 15, field_key: "pessoas.objecao_principal",          form_type: "pessoas" },
  { question_order: 16, field_key: "pessoas.objecoes_secundarias",       form_type: "pessoas" },
  { question_order: 17, field_key: "pessoas.desejo_principal",           form_type: "pessoas" },
  { question_order: 18, field_key: "pessoas.desejos_secundarios",        form_type: "pessoas" },
  { question_order: 19, field_key: "pessoas.tensao_central",             form_type: "pessoas" },
  { question_order: 20, field_key: "pessoas.criterios_confianca",        form_type: "pessoas" },
  { question_order: 21, field_key: "pessoas.momento_busca",              form_type: "pessoas" },
  { question_order: 22, field_key: "pessoas.tentativas_anteriores",      form_type: "pessoas" },
  { question_order: 23, field_key: "comunicacao.crenca_central",         form_type: "comunicacao" },
  { question_order: 24, field_key: "comunicacao.tese_principal",         form_type: "comunicacao" },
  { question_order: 25, field_key: "comunicacao.mensagem_central",       form_type: "comunicacao" },
  { question_order: 26, field_key: "comunicacao.tom_de_voz",             form_type: "comunicacao" },
  { question_order: 27, field_key: "comunicacao.palavras_chave",         form_type: "comunicacao" },
  { question_order: 28, field_key: "comunicacao.territorios_editoriais", form_type: "comunicacao" },
];

const BRIEFING_MAP_BY_ORDER = new Map(BRIEFING_QUESTIONS.map(q => [q.question_order, q]));

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gpt-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function isoNow() {
  return new Date().toISOString();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  return { response, data };
}

function first<T>(arr: T[] | null | undefined): T | null {
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
}

function extractGptToken(req: Request, body: any) {
  const fromBody = body?.gpt_token || body?.user_token || body?.token || body?.access_token || null;
  if (typeof fromBody === "string" && fromBody.trim()) return fromBody.trim();

  const fromHeader = req.headers.get("x-gpt-token");
  if (fromHeader?.trim()) return fromHeader.trim();

  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const value = auth.slice(7).trim();
    if (value.startsWith("planto_")) return value;
  }

  return "";
}

async function resolveUserFromGptToken(gptToken: string) {
  const tokenHash = await sha256Hex(gptToken);
  const params = new URLSearchParams({
    token_hash: `eq.${tokenHash}`,
    status: "eq.active",
    select: "id,user_id,expires_at,revoked_at,label",
  });

  const { response, data } = await supabaseFetch(`/rest/v1/gpt_access_tokens?${params.toString()}`);
  if (!response.ok) throw new Error(data?.message || data?.error || "Falha ao validar token GPT.");

  const row = first<any>(data);
  if (!row) return { ok: false, error: "Token GPT invalido." };
  if (row.revoked_at) return { ok: false, error: "Token GPT revogado." };
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "Token GPT expirado." };
  }

  return { ok: true, userId: row.user_id, tokenLabel: row.label || "Token GPT" };
}

function parseAction(body: any) {
  if (typeof body?.action === "string" && body.action.trim()) return body.action.trim().toLowerCase();
  if (typeof body?.operation === "string" && body.operation.trim()) return body.operation.trim().toLowerCase();
  if (typeof body?.intent === "string" && body.intent.trim()) return body.intent.trim().toLowerCase();
  return "";
}

function getLayerFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const handlerIndex = segments.lastIndexOf("documents-handler");
  if (handlerIndex === -1) return null;
  const layer = segments[handlerIndex + 1] || null;
  if (layer === "knowledge" || layer === "strategy" || layer === "execution") return layer;
  return null;
}

function normalizeMetadataJson(input: unknown, fallback: Record<string, unknown> = {}) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return fallback;
}

function normalizeObject(input: unknown, fallback: Record<string, unknown> = {}) {
  if (input && typeof input === "object" && !Array.isArray(input)) return input as Record<string, unknown>;
  return fallback;
}

function parseSignedUrlExpiry(body: any) {
  const value = Number(body?.signed_url_expires_in ?? 3600);
  if (!Number.isFinite(value) || value <= 0) return 3600;
  return Math.min(Math.max(Math.floor(value), 60), 86400);
}

async function listAttachments(userId: string, includeSignedUrls: boolean, expiresIn: number) {
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "id,user_id,filename,mime_type,file_size,storage_bucket,storage_path,source_kind,metadata_json,content_text,created_at,updated_at",
    order: "created_at.desc",
  });

  const { response, data } = await supabaseFetch(`/rest/v1/user_attachments?${params.toString()}`);
  if (!response.ok) throw new Error(data?.message || data?.error || "Falha ao listar anexos.");

  const attachments = Array.isArray(data) ? data : [];
  if (!includeSignedUrls || attachments.length === 0) return attachments;

  return await Promise.all(
    attachments.map(async (item: any) => {
      const bucket = item.storage_bucket || "brand-library";
      const encodedPath = String(item.storage_path || "")
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      const signed = await supabaseFetch(`/storage/v1/object/sign/${bucket}/${encodedPath}`, {
        method: "POST",
        body: JSON.stringify({ expiresIn }),
      });

      let signedUrl: string | null = null;
      if (signed.response.ok) {
        const partial = signed.data?.signedURL || signed.data?.signedUrl || null;
        if (typeof partial === "string") {
          signedUrl = partial.startsWith("http") ? partial : `${SUPABASE_URL}/storage/v1${partial}`;
        }
      }

      return { ...item, signed_url: signedUrl };
    }),
  );
}

async function listBrandKnowledge(userId: string, body: any) {
  const status = String(body?.status || "active").trim().toLowerCase();
  const itemGroup = String(body?.item_group || "").trim().toLowerCase();
  const itemKey = String(body?.item_key || "").trim().toLowerCase();
  const limit = Math.min(Math.max(Number.isFinite(Number(body?.limit)) ? Math.floor(Number(body.limit)) : 200, 1), 500);

  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "id,user_id,item_key,item_group,item_kind,value_text,value_json,truth_type,confidence,is_canonical,status,created_at,updated_at,source_table,source_id,readable_label",
    order: "item_group.asc,item_key.asc,updated_at.desc",
    limit: String(limit),
  });

  if (ALLOWED_BRAND_KNOWLEDGE_STATUSES.has(status)) params.set("status", `eq.${status}`);
  if (itemGroup) params.set("item_group", `eq.${itemGroup}`);
  if (itemKey) params.set("item_key", `eq.${itemKey}`);

  const { response, data } = await supabaseFetch(`/rest/v1/brand_knowledge?${params.toString()}`);
  if (!response.ok) return json({ error: data?.message || "Falha ao listar brand_knowledge." }, 500);

  return json({ success: true, layer: "knowledge", user_id: userId, count: Array.isArray(data) ? data.length : 0, brand_knowledge: Array.isArray(data) ? data : [] }, 200);
}

async function getStrategicContextRaw(userId: string) {
  const { response, data } = await supabaseFetch("/rest/v1/rpc/get_strategic_context", {
    method: "POST",
    body: JSON.stringify({ p_user_id: userId }),
  });

  if (!response.ok) throw new Error(data?.message || data?.error || "Falha ao ler contexto estrategico.");
  return data ?? null;
}

// Calcula cobertura do briefing para o GPT saber o que falta
async function getBriefingCoverage(userId: string): Promise<{
  total: number;
  answered_count: number;
  gap_count: number;
  answered_field_keys: string[];
  missing_questions: { question_order: number; field_key: string; form_type: string }[];
}> {
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    answer_type: "eq.briefing",
    response_status: "eq.active",
    select: "field_key",
  });

  const { response, data } = await supabaseFetch(`/rest/v1/brand_context_responses?${params.toString()}`);
  if (!response.ok) throw new Error("Falha ao ler cobertura do briefing.");

  const answeredKeys = new Set<string>(
    (Array.isArray(data) ? data : []).map((r: any) => r.field_key).filter(Boolean)
  );

  const answered = BRIEFING_QUESTIONS.filter(q => answeredKeys.has(q.field_key));
  const missing = BRIEFING_QUESTIONS.filter(q => !answeredKeys.has(q.field_key));

  return {
    total: BRIEFING_QUESTIONS.length,
    answered_count: answered.length,
    gap_count: missing.length,
    answered_field_keys: answered.map(q => q.field_key),
    missing_questions: missing.map(q => ({
      question_order: q.question_order,
      field_key: q.field_key,
      form_type: q.form_type,
    })),
  };
}

async function getKnowledgeContext(userId: string, includeSignedUrls: boolean, expiresIn: number) {
  const [profileR, knowledgeR, memoryR, attachments] = await Promise.all([
    supabaseFetch(`/rest/v1/user_profiles?id=eq.${userId}&select=*&limit=1`),
    supabaseFetch(`/rest/v1/brand_knowledge?user_id=eq.${userId}&status=eq.active&select=id,user_id,item_key,item_group,item_kind,value_text,value_json,truth_type,confidence,is_canonical,status,source_table,source_id,readable_label,created_at,updated_at&order=item_group.asc,item_key.asc,updated_at.desc&limit=200`),
    supabaseFetch(`/rest/v1/memory_notes?user_id=eq.${userId}&select=id,user_id,note_title,note_content,tag,note_type,source,context_type,created_at,updated_at&order=created_at.desc&limit=200`),
    listAttachments(userId, includeSignedUrls, expiresIn),
  ]);

  if (!profileR.response.ok) throw new Error("Falha ao ler user_profiles.");
  if (!knowledgeR.response.ok) throw new Error("Falha ao ler brand_knowledge.");
  if (!memoryR.response.ok) throw new Error("Falha ao ler memory_notes.");

  return {
    success: true,
    layer: "knowledge",
    user_id: userId,
    user_profiles: first(profileR.data),
    brand_knowledge: Array.isArray(knowledgeR.data) ? knowledgeR.data : [],
    memory_notes: Array.isArray(memoryR.data) ? memoryR.data : [],
    user_attachments: attachments,
  };
}

async function getStrategyContext(userId: string) {
  // Busca contexto estratégico e cobertura do briefing em paralelo
  const [strategic, briefingCoverage] = await Promise.all([
    getStrategicContextRaw(userId),
    getBriefingCoverage(userId),
  ]);

  return {
    success: true,
    layer: "strategy",
    user_id: userId,
    // Cobertura do briefing: o GPT usa isso para saber quais perguntas ainda faltam
    briefing_coverage: briefingCoverage,
    strategic_assessments: strategic?.assessment ? [strategic.assessment] : [],
    strategic_diagnostics: Array.isArray(strategic?.diagnostics) ? strategic.diagnostics : [],
    strategic_conflicts: Array.isArray(strategic?.conflicts) ? strategic.conflicts : [],
    strategic_gaps: Array.isArray(strategic?.gaps) ? strategic.gaps : [],
    // next_questions já inclui briefing_question_order e briefing_field_key quando vinculadas ao briefing
    strategic_next_questions: Array.isArray(strategic?.next_questions) ? strategic.next_questions : [],
    strategic_evidence_links: Array.isArray(strategic?.evidence_links) ? strategic.evidence_links : [],
  };
}

async function getExecutionContext(userId: string) {
  const [modelsR, editorialR] = await Promise.all([
    supabaseFetch(`/rest/v1/plataforma_marca?user_id=eq.${userId}&select=id,user_id,model_key,schema_version,output_json,status,created_at,updated_at,input_item_ids&order=updated_at.desc&limit=100`),
    supabaseFetch(`/rest/v1/editorial_system?user_id=eq.${userId}&status=eq.active&select=*&order=sort_order.asc,created_at.asc&limit=100`),
  ]);

  if (!modelsR.response.ok) throw new Error("Falha ao ler plataforma_marca.");
  if (!editorialR.response.ok) throw new Error("Falha ao ler editorial_system.");

  return {
    success: true,
    layer: "execution",
    user_id: userId,
    plataforma_marca: Array.isArray(modelsR.data) ? modelsR.data : [],
    editorial_system: Array.isArray(editorialR.data) ? editorialR.data : [],
  };
}

async function saveMemoryNote(userId: string, body: any) {
  const noteTitle = String(body?.note_title || body?.title || "").trim() || "Entrada GPT";
  const noteContent = String(body?.note_content || body?.content || "").trim();
  const tag = String(body?.note_tag || body?.tag || "note").trim() || "note";
  const noteType = String(body?.note_type || "note").trim() || "note";
  const source = String(body?.source || "gpt").trim() || "gpt";
  const contextType = String(body?.context_type || "nota_usuario").trim() || "nota_usuario";

  if (!noteContent) return json({ error: "Campo 'note_content' e obrigatorio." }, 400);
  if (!ALLOWED_NOTE_CONTEXT_TYPES.has(contextType)) return json({ error: "Campo 'context_type' invalido." }, 400);

  const payload = {
    user_id: userId,
    note_title: noteTitle,
    note_content: noteContent,
    tag,
    note_type: noteType,
    source,
    context_type: contextType,
    updated_at: isoNow(),
  };

  const { response, data } = await supabaseFetch("/rest/v1/memory_notes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return json({ error: data?.message || data?.error || "Falha ao salvar nota." }, 500);
  return json({ success: true, layer: "knowledge", mode: "memory_note_saved", note: first(data) }, 200);
}

async function updateMemoryNote(userId: string, body: any) {
  const noteId = String(body?.note_id || body?.id || "").trim();
  if (!noteId) return json({ error: "Campo 'note_id' e obrigatorio." }, 400);

  const payload: Record<string, unknown> = { updated_at: isoNow() };
  if (typeof body?.note_title === "string") payload.note_title = body.note_title.trim();
  if (typeof body?.note_content === "string") payload.note_content = body.note_content.trim();
  if (typeof body?.tag === "string") payload.tag = body.tag.trim();
  if (typeof body?.note_tag === "string") payload.tag = body.note_tag.trim();
  if (typeof body?.note_type === "string") payload.note_type = body.note_type.trim();
  if (typeof body?.source === "string") payload.source = body.source.trim();
  if (typeof body?.context_type === "string") {
    const contextType = body.context_type.trim();
    if (!ALLOWED_NOTE_CONTEXT_TYPES.has(contextType)) return json({ error: "Campo 'context_type' invalido." }, 400);
    payload.context_type = contextType;
  }

  if (Object.keys(payload).length === 1) return json({ error: "Nenhum campo atualizavel enviado para update_memory_note." }, 400);

  const { response, data } = await supabaseFetch(`/rest/v1/memory_notes?id=eq.${encodeURIComponent(noteId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return json({ error: data?.message || data?.error || "Falha ao atualizar nota." }, 500);
  const note = first(data);
  if (!note) return json({ error: "Nota nao encontrada." }, 404);
  return json({ success: true, layer: "knowledge", mode: "memory_note_updated", note }, 200);
}

async function updateProfile(userId: string, body: any) {
  const source = normalizeObject(body?.profile, body);
  const payload: Record<string, unknown> = {
    id: userId,
    updated_at: isoNow(),
  };

  for (const field of PROFILE_FIELDS) {
    if (source[field] !== undefined) payload[field] = source[field];
  }

  if (Object.keys(payload).length === 2) return json({ error: "Nenhum campo de perfil enviado para update_profile." }, 400);

  const { response, data } = await supabaseFetch("/rest/v1/user_profiles?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return json({ error: data?.message || data?.error || "Falha ao atualizar perfil." }, 500);
  return json({ success: true, layer: "knowledge", mode: "profile_updated", user_profiles: first(data) }, 200);
}

async function semanticSearch(userId: string, body: any) {
  const query = String(body?.query || "").trim();
  if (!query) return json({ error: "Campo 'query' é obrigatório para semantic_search." }, 400);

  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY não configurada no servidor." }, 500);

  const matchThreshold = Math.min(Math.max(Number.isFinite(Number(body?.match_threshold)) ? Number(body.match_threshold) : 0.5, 0), 1);
  const matchCount = Math.min(Math.max(Number.isFinite(Number(body?.match_count)) ? Math.floor(Number(body.match_count)) : 8, 1), 20);
  // Fontes a buscar: permite filtrar por fonte específica ou busca em todas
  const requestedSources: string[] = Array.isArray(body?.sources) ? body.sources : [
    "brand_knowledge",
    "brand_context_responses",
    "memory_notes",
    "plataforma_marca",
    "user_attachments",
  ];

  // 1. Gerar embedding da query uma única vez
  const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: query.slice(0, 8000),
    }),
  });

  if (!embeddingRes.ok) {
    const errText = await embeddingRes.text();
    return json({ error: `Falha ao gerar embedding da query: ${errText}` }, 500);
  }

  const embeddingData = await embeddingRes.json();
  const queryEmbedding: number[] = embeddingData?.data?.[0]?.embedding;
  if (!queryEmbedding) return json({ error: "Embedding não retornado pela OpenAI." }, 500);

  // 2. Mapa de RPCs por fonte
  const RPC_MAP: Record<string, string> = {
    brand_knowledge:          "match_brand_knowledge",
    brand_context_responses:  "match_brand_context_responses",
    memory_notes:             "match_memory_notes",
    plataforma_marca:         "match_plataforma_marca",
    user_attachments:         "match_user_attachments",
  };

  // 3. Executar todas as buscas em paralelo
  const searchPromises = requestedSources
    .filter((src) => RPC_MAP[src])
    .map(async (src) => {
      const rpc = RPC_MAP[src];
      const { response, data } = await supabaseFetch(`/rest/v1/rpc/${rpc}`, {
        method: "POST",
        body: JSON.stringify({
          query_embedding: queryEmbedding,
          p_user_id: userId,
          match_threshold: matchThreshold,
          match_count: matchCount,
        }),
      });
      if (!response.ok) return { source: src, results: [], error: data?.message || data?.error };
      const results = Array.isArray(data) ? data : [];
      return {
        source: src,
        results: results.map((r: any) => ({ ...r, _source: src })),
        count: results.length,
      };
    });

  const searchResults = await Promise.all(searchPromises);

  // 4. Agregar e ordenar por similaridade (ranking global)
  const allResults = searchResults.flatMap((r) => r.results);
  allResults.sort((a: any, b: any) => (b.similarity ?? 0) - (a.similarity ?? 0));

  // 5. Montar resposta estruturada por fonte
  const bySource: Record<string, any[]> = {};
  for (const r of searchResults) {
    bySource[r.source] = r.results;
  }

  return json({
    success: true,
    layer: "knowledge",
    mode: "semantic_search",
    user_id: userId,
    query,
    match_threshold: matchThreshold,
    match_count: matchCount,
    total_count: allResults.length,
    // Resultados globais ordenados por relevância (útil para RAG direto)
    ranked_results: allResults,
    // Resultados agrupados por fonte (útil para contexto estruturado)
    by_source: bySource,
    // Retrocompatibilidade: brand_knowledge ainda presente no topo
    brand_knowledge: bySource["brand_knowledge"] ?? [],
  }, 200);
}







async function triggerStrategyRefresh(userId: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
  };

  const invoke = () =>
    fetch(`${SUPABASE_URL}/functions/v1/evaluate-strategy`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: userId, force: true }),
    });

  let response = await invoke();
  let text = await response.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }

  if (!response.ok) {
    await sleep(250);
    response = await invoke();
    text = await response.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    } else { data = null; }
  }

  if (!response.ok) {
    await sleep(750);
    response = await invoke();
    text = await response.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    } else { data = null; }
  }

  return { response, data };
}

async function answerStrategicQuestion(userId: string, body: any) {
  const questionId = String(body?.question_id || body?.strategic_question_id || "").trim();
  const answerText = String(body?.answer_text || body?.value_text || body?.content || "").trim();
  const answerJson = normalizeObject(body?.answer_json, {});

  if (!questionId) return json({ error: "Campo 'question_id' e obrigatorio." }, 400);
  if (!answerText) return json({ error: "Campo 'answer_text' e obrigatorio." }, 400);

  // Busca a pergunta incluindo os novos campos de vínculo com o briefing
  const questionLookup = await supabaseFetch(
    `/rest/v1/strategic_next_questions?id=eq.${encodeURIComponent(questionId)}&user_id=eq.${encodeURIComponent(userId)}&select=id,assessment_id,question_text,question_goal,dimension_key,priority,status,briefing_question_order,briefing_field_key&limit=1`
  );
  if (!questionLookup.response.ok) return json({ error: questionLookup.data?.message || questionLookup.data?.error || "Falha ao localizar pergunta estrategica." }, 500);

  const question = first<any>(questionLookup.data);
  if (!question) return json({ error: "Pergunta estrategica nao encontrada." }, 404);
  if (question.status !== "active") return json({ error: "A pergunta estrategica nao esta ativa." }, 400);

  // Determina se a pergunta visa fechar um slot do briefing
  const isBriefingQuestion = (
    typeof question.briefing_question_order === "number" &&
    typeof question.briefing_field_key === "string" &&
    question.briefing_field_key.trim() !== ""
  );

  // Se for pergunta de briefing, busca os metadados canônicos pelo question_order
  const briefingMeta = isBriefingQuestion
    ? BRIEFING_MAP_BY_ORDER.get(question.briefing_question_order)
    : null;

  // Monta o payload de resposta
  // - Pergunta de briefing: field_key = briefing_field_key, form_type = form_type canônico, answer_type = 'briefing'
  // - Pergunta estratégica pura: field_key = dimension_key, form_type = 'strategic_question', answer_type = 'strategic'
  const responsePayload = isBriefingQuestion && briefingMeta
    ? {
        user_id: userId,
        form_type: briefingMeta.form_type,                   // ex: 'pessoas'
        form_version: "v3-gpt",                              // distingue de v2-attachments e v1
        field_key: briefingMeta.field_key,                   // ex: 'pessoas.publico_prioritario'
        question_order: briefingMeta.question_order,         // ex: 11
        value_text: answerText,
        value_json: {
          question_text: question.question_text,
          question_goal: question.question_goal,
          dimension_key: question.dimension_key,
          briefing_question_order: question.briefing_question_order,
          answer_text: answerText,
          ...answerJson,
        },
        response_status: "active",
        answer_type: "briefing",                             // fecha o slot do briefing
        source_question_id: question.id,
        updated_at: isoNow(),
      }
    : {
        user_id: userId,
        form_type: "strategic_question",
        form_version: "v1",
        field_key: question.dimension_key || "strategic.general",
        value_text: answerText,
        value_json: {
          question_text: question.question_text,
          question_goal: question.question_goal,
          dimension_key: question.dimension_key,
          answer_text: answerText,
          ...answerJson,
        },
        question_order: Number.isFinite(Number(question.priority)) ? Number(question.priority) : 1,
        response_status: "active",
        answer_type: "strategic",
        source_question_id: question.id,
        updated_at: isoNow(),
      };

  const inserted = await supabaseFetch("/rest/v1/brand_context_responses", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(responsePayload),
  });
  if (!inserted.response.ok) return json({ error: inserted.data?.message || inserted.data?.error || "Falha ao salvar resposta estrategica." }, 500);

  const answerResponse = first<any>(inserted.data);
  if (!answerResponse?.id) return json({ error: "Resposta estrategica nao foi retornada pelo banco." }, 500);

  // Marca a pergunta como respondida
  const updatedQuestion = await supabaseFetch(`/rest/v1/strategic_next_questions?id=eq.${encodeURIComponent(question.id)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status: "answered",
      answered_at: isoNow(),
      answer_response_id: answerResponse.id,
      updated_at: isoNow(),
    }),
  });
  if (!updatedQuestion.response.ok) return json({ error: updatedQuestion.data?.message || updatedQuestion.data?.error || "Falha ao atualizar strategic_next_questions." }, 500);

  // Se for pergunta de briefing, dispara process-brand-briefing para promover ao brand_knowledge
  // Se for pergunta estratégica pura, usa a RPC existente
  if (isBriefingQuestion) {
    // Fire-and-forget: process-brand-briefing reprocessa todos os brand_context_responses ativos
    fetch(`${SUPABASE_URL}/functions/v1/process-brand-briefing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ user_id: userId }),
    }).catch(() => {});
  } else {
    // Pergunta estratégica pura: usa a RPC de promoção pontual
    const promoted = await supabaseFetch("/rest/v1/rpc/promote_strategic_response_to_knowledge", {
      method: "POST",
      body: JSON.stringify({ p_response_id: answerResponse.id }),
    });
    if (!promoted.response.ok) return json({ error: promoted.data?.message || promoted.data?.error || "Falha ao promover resposta estrategica para brand_knowledge." }, 500);
  }

  // Reavalia a estratégia com as novas respostas
  const reevaluated = await triggerStrategyRefresh(userId);
  if (!reevaluated.response.ok) {
    const fallbackContext = await getStrategyContext(userId);
    return json({
      success: true,
      layer: "strategy",
      mode: "strategic_question_answered",
      is_briefing_answer: isBriefingQuestion,
      strategic_answer_response: answerResponse,
      strategy_refresh_pending: true,
      re_evaluation_error: reevaluated.data?.error || reevaluated.data?.message || "Falha ao reavaliar estrategia.",
      retry_attempted: true,
      ...fallbackContext,
    }, 200);
  }

  const context = await getStrategyContext(userId);
  return json({
    success: true,
    layer: "strategy",
    mode: "strategic_question_answered",
    is_briefing_answer: isBriefingQuestion,
    strategic_answer_response: answerResponse,
    ...context,
  }, 200);
}

function unsupported(layer: string, supportedActions: readonly string[]) {
  return json({
    error: "Acao nao suportada para esta camada.",
    layer,
    supported_actions: supportedActions,
  }, 400);
}

Deno.serve(async (req) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Ambiente nao configurado." }, 500);
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: jsonHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  const pathname = new URL(req.url).pathname;
  const layer = getLayerFromPath(pathname);
  if (!layer) {
    return json({
      error: "Path nao suportado. Use /documents-handler/knowledge, /documents-handler/strategy ou /documents-handler/execution.",
      supported_paths: ["/documents-handler/knowledge", "/documents-handler/strategy", "/documents-handler/execution"],
    }, 404);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON invalido." }, 400);
  }

  const gptToken = extractGptToken(req, body);
  if (!gptToken) return json({ error: "Token GPT ausente." }, 401);

  let resolved;
  try {
    resolved = await resolveUserFromGptToken(gptToken);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Falha ao validar token." }, 500);
  }
  if (!resolved.ok || !resolved.userId) return json({ error: resolved.error || "Token invalido." }, 401);

  const userId = resolved.userId;
  const action = parseAction(body);
  const includeSignedUrls = body?.include_signed_urls !== false;
  const expiresIn = parseSignedUrlExpiry(body);

  if (action === "health" || action === "ping") {
    return json({ ok: true, success: true, layer, user_id: userId, token_label: resolved.tokenLabel }, 200);
  }

  try {
    if (layer === "knowledge") {
      if (action === "get_knowledge_context" || action === "knowledge_context") {
        return json(await getKnowledgeContext(userId, includeSignedUrls, expiresIn), 200);
      }
      if (action === "get_brand_knowledge" || action === "list_brand_knowledge" || action === "read_brand_knowledge") {
        return await listBrandKnowledge(userId, body);
      }
      if (action === "list_attachments" || action === "read_attachments" || action === "attachments") {
        const attachments = await listAttachments(userId, includeSignedUrls, expiresIn);
        return json({ success: true, layer: "knowledge", user_id: userId, count: attachments.length, user_attachments: attachments }, 200);
      }
      if (action === "save_memory_note" || action === "memory_note" || action === "note" || action === "save_entry") {
        return await saveMemoryNote(userId, body);
      }
      if (action === "update_memory_note") {
        return await updateMemoryNote(userId, body);
      }
      if (action === "update_profile") {
        return await updateProfile(userId, body);
      }
      if (action === "semantic_search") {
        return await semanticSearch(userId, body);
      }
      return unsupported(layer, KNOWLEDGE_ACTIONS);
    }

    if (layer === "strategy") {
      if (action === "get_strategy_context" || action === "strategy_context") {
        return json(await getStrategyContext(userId), 200);
      }
      if (action === "answer_strategic_question") {
        return await answerStrategicQuestion(userId, body);
      }
      return unsupported(layer, STRATEGY_ACTIONS);
    }

    if (layer === "execution") {
      if (action === "get_execution_context" || action === "execution_context") {
        return json(await getExecutionContext(userId), 200);
      }
      return unsupported(layer, EXECUTION_ACTIONS);
    }

    return json({ error: "Camada invalida." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno no documents-handler." }, 500);
  }
});
