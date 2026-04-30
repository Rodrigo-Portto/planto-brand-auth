import type { NextApiRequest, NextApiResponse } from 'next';
import {
  supabaseRest,
} from '../../../lib/supabase/api';

interface ProcessResult {
  success: boolean;
  processed: number;
  generated: number;
  failed: number;
  error?: string;
}

async function callOpenAI(
  prompt: string,
  openaiApiKey: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em estratégia de conteúdo e branding.
Seu objetivo é gerar linhas editoriais baseadas na análise estratégica da marca.
Cada entrada deve ser uma linha editorial clara, acionável e alinhada com os objetivos estratégicos.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI API error: ${response.status} - ${await response.text()}`
    );
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content || '';
}

function buildPrompt(brandContext: Record<string, unknown>): string {
  const brandKnowledge = (
    brandContext.brand_knowledge as Array<{
      form_type: string;
      content: string;
    }>
  )
    .map((k) => `- ${k.form_type}: ${k.content}`)
    .join('\n');

  const profile = brandContext.user_profile as {
    name: string;
    market_niche: string;
    business_stage: string;
    main_services: string;
    ideal_client: string;
    priority_channels: string[];
  };

  // Corrigido: campo real é reasoning_json, não assessment_json
  const assessmentData =
    (brandContext.recent_assessments as Array<{ reasoning_json: unknown }> | undefined)?.[0]?.reasoning_json || {};

  const profileContext = `
Marca: ${profile?.name || 'Sem nome'}
Nicho: ${profile?.market_niche || 'Não definido'}
Estágio: ${profile?.business_stage || 'Não definido'}
Serviços: ${profile?.main_services || 'Não definido'}
Cliente Ideal: ${profile?.ideal_client || 'Não definido'}
Canais Prioritários: ${(profile?.priority_channels || []).join(', ') || 'Não definido'}
`;

  return `
Com base na análise estratégica da marca, gere 7-10 LINHAS EDITORIAIS para o calendário de conteúdo.

CONTEXTO DA MARCA:
${profileContext}

CONHECIMENTOS CHAVE:
${brandKnowledge || 'Sem conhecimentos registrados'}

ANÁLISE ESTRATÉGICA MAIS RECENTE:
${JSON.stringify(assessmentData, null, 2)}

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

// Corrigido: campos alinhados com as colunas reais da tabela editorial_system
interface EditorialEntry {
  title: string;
  core_message: string;
  format: string;
  audience_moment: string;
  cta_type: string;
}

function parseEditorialEntries(response: string): EditorialEntry[] {
  try {
    const parsed = JSON.parse(response) as unknown;
    const entries = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { entries?: unknown }).entries)
        ? ((parsed as { entries?: unknown }).entries as unknown[])
        : [parsed];

    return (entries as Record<string, unknown>[])
      .map((entry) => ({
        title: String(entry.title || ''),
        core_message: String(entry.core_message || ''),
        format: String(entry.format || 'social'),
        audience_moment: String(entry.audience_moment || ''),
        cta_type: String(entry.cta_type || 'engajamento'),
      }))
      .filter((e) => e.title && e.core_message);
  } catch (error) {
    console.error('Failed to parse editorial entries:', response);
    throw new Error(`Invalid editorial entries format from OpenAI`);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessResult>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      processed: 0,
      generated: 0,
      failed: 0,
      error: 'Método não permitido. Use POST.',
    });
  }

  // Validação de segurança: pode ser chamado via cron ou manualmente com token
  const authHeader = req.headers.authorization || '';
  const cronToken = process.env.EDITORIAL_CRON_TOKEN;

  if (
    cronToken &&
    !authHeader.includes(cronToken) &&
    req.headers['x-vercel-cron'] !== cronToken
  ) {
    return res.status(401).json({
      success: false,
      processed: 0,
      generated: 0,
      failed: 0,
      error: 'Não autorizado.',
    });
  }

  const openaiApiKey = process.env.OPENAI_API_KEY || '';
  if (!openaiApiKey) {
    return res.status(500).json({
      success: false,
      processed: 0,
      generated: 0,
      failed: 0,
      error: 'OPENAI_API_KEY não configurado.',
    });
  }

  // Corrigido: a tabela editorial_generation_queue não existe no banco.
  // O assessment_id é recebido diretamente no body da requisição.
  const { assessment_id } = req.body as { assessment_id?: string };

  if (!assessment_id) {
    return res.status(400).json({
      success: false,
      processed: 0,
      generated: 0,
      failed: 0,
      error: 'assessment_id é obrigatório no body da requisição.',
    });
  }

  try {
    // Busca o assessment e o user_id associado
    const assessRes = await supabaseRest(
      `/rest/v1/strategic_assessments?id=eq.${encodeURIComponent(assessment_id)}&select=id,user_id`,
      { serviceRole: true }
    );

    if (!assessRes.response.ok || !Array.isArray(assessRes.data) || assessRes.data.length === 0) {
      return res.status(404).json({
        success: false,
        processed: 0,
        generated: 0,
        failed: 0,
        error: 'Assessment não encontrado.',
      });
    }

    const assessment = assessRes.data[0] as { id: string; user_id: string };

    // Busca contexto da marca via RPC PostgreSQL
    const contextRes = await supabaseRest(
      '/rest/v1/rpc/get_strategic_context',
      {
        method: 'POST',
        body: { p_user_id: assessment.user_id },
        serviceRole: true,
      }
    );

    if (!contextRes.response.ok) {
      throw new Error(`Failed to get brand context: ${JSON.stringify(contextRes.data)}`);
    }

    const brandContext = contextRes.data as Record<string, unknown>;

    // Gera conteúdo editorial via OpenAI
    const prompt = buildPrompt(brandContext);
    const openaiResponse = await callOpenAI(prompt, openaiApiKey);
    const editorialEntries = parseEditorialEntries(openaiResponse);

    let generated = 0;
    let failed = 0;

    // Insere em editorial_system com os campos corretos da tabela
    if (editorialEntries.length > 0) {
      const insertRes = await supabaseRest(
        '/rest/v1/editorial_system',
        {
          method: 'POST',
          body: editorialEntries.map((entry) => ({
            // Corrigido: assessment_id não existe em editorial_system — removido
            user_id: assessment.user_id,
            title: entry.title,
            core_message: entry.core_message,
            format: entry.format,
            audience_moment: entry.audience_moment,
            cta_type: entry.cta_type,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
          serviceRole: true,
        }
      );

      if (!insertRes.response.ok) {
        throw new Error(
          `Failed to insert editorial entries: ${JSON.stringify(insertRes.data)}`
        );
      }

      generated = editorialEntries.length;
      console.log(`✅ Generated ${generated} entries for assessment ${assessment_id}`);
    }

    return res.status(200).json({
      success: true,
      processed: 1,
      generated,
      failed,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Fatal error in editorial generation:', errorMsg);

    return res.status(500).json({
      success: false,
      processed: 0,
      generated: 0,
      failed: 1,
      error: errorMsg,
    });
  }
}
