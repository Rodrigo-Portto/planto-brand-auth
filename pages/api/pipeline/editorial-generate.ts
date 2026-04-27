import type { NextApiRequest, NextApiResponse } from 'next';
import {
  supabaseRest,
  SUPABASE_SERVICE_KEY,
  SUPABASE_URL,
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
Seu objetivo é gerar sugestões de conteúdo editorial baseado na análise estratégica da marca.
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

  const assessmentData =
    (brandContext.recent_assessments as Array<{ assessment_json: unknown }>)
      ?.at(0)?.assessment_json || {};

  const profileContext = `
Marca: ${profile?.name || 'Sem nome'}
Nicho: ${profile?.market_niche || 'Não definido'}
Estágio: ${profile?.business_stage || 'Não definido'}
Serviços: ${profile?.main_services || 'Não definido'}
Cliente Ideal: ${profile?.ideal_client || 'Não definido'}
Canais Prioritários: ${(profile?.priority_channels || []).join(', ') || 'Não definido'}
`;

  return `
Com base na análise estratégica da marca, gere 7-10 LINHAS EDITORIAIS (tópicos/ideias de conteúdo) para o calendário futuro.

CONTEXTO DA MARCA:
${profileContext}

CONHECIMENTOS CHAVE:
${brandKnowledge || 'Sem conhecimentos registrados'}

ANÁLISE ESTRATÉGICA MAIS RECENTE:
${JSON.stringify(assessmentData, null, 2)}

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

interface EditorialEntry {
  topic: string;
  content: string;
  suggested_platforms: string[];
  tone: string;
  content_type: string;
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
        topic: String(entry.topic || ''),
        content: String(entry.content || ''),
        suggested_platforms: Array.isArray(entry.suggested_platforms)
          ? (entry.suggested_platforms as string[]).map(String)
          : [],
        tone: String(entry.tone || 'Profissional'),
        content_type: String(entry.content_type || 'social'),
      }))
      .filter((e) => e.topic && e.content);
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

  try {
    // Busca jobs pendentes
    const encoded = encodeURIComponent('pending');
    const queueRes = await supabaseRest(
      `/rest/v1/editorial_generation_queue?status=eq.${encoded}&select=id,assessment_id&limit=10`,
      { serviceRole: true }
    );

    if (!queueRes.response.ok) {
      throw new Error(
        `Failed to fetch queue: ${JSON.stringify(queueRes.data)}`
      );
    }

    const queueItems = Array.isArray(queueRes.data) ? queueRes.data : [];

    if (queueItems.length === 0) {
      return res.status(200).json({
        success: true,
        processed: 0,
        generated: 0,
        failed: 0,
      });
    }

    let generated = 0;
    let failed = 0;

    for (const queueItem of queueItems as { id: string; assessment_id: string }[]) {
      try {
        // Marca como processando
        await supabaseRest(
          `/rest/v1/editorial_generation_queue?id=eq.${encodeURIComponent(queueItem.id)}`,
          {
            method: 'PATCH',
            body: { status: 'processing', updated_at: new Date().toISOString() },
            serviceRole: true,
          }
        );

        // Busca assessment
        const assessRes = await supabaseRest(
          `/rest/v1/strategic_assessments?id=eq.${encodeURIComponent(queueItem.assessment_id)}&select=id,user_id`,
          { serviceRole: true }
        );

        if (!assessRes.response.ok || !Array.isArray(assessRes.data)) {
          throw new Error('Assessment não encontrado');
        }

        const assessment = assessRes.data[0] as { id: string; user_id: string };

        // Busca contexto da marca via REST (chamando função PostgreSQL)
        const contextRes = await supabaseRest(
          '/rest/v1/rpc/get_brand_context_for_editorial',
          {
            method: 'POST',
            body: { user_id_param: assessment.user_id },
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

        // Insere em editorial_system
        if (editorialEntries.length > 0) {
          const insertRes = await supabaseRest(
            '/rest/v1/editorial_system',
            {
              method: 'POST',
              body: editorialEntries.map((entry) => ({
                assessment_id: queueItem.assessment_id,
                user_id: assessment.user_id,
                topic: entry.topic,
                content: entry.content,
                suggested_platforms: entry.suggested_platforms,
                tone: entry.tone,
                content_type: entry.content_type,
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
        }

        // Marca como completo
        await supabaseRest(
          `/rest/v1/editorial_generation_queue?assessment_id=eq.${encodeURIComponent(queueItem.assessment_id)}`,
          {
            method: 'PATCH',
            body: {
              status: 'completed',
              updated_at: new Date().toISOString(),
            },
            serviceRole: true,
          }
        );

        generated++;
        console.log(
          `✅ Generated ${editorialEntries.length} entries for assessment ${queueItem.assessment_id}`
        );
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `❌ Failed for ${queueItem.assessment_id}: ${errorMsg}`
        );

        // Marca como falha
        await supabaseRest(
          `/rest/v1/editorial_generation_queue?assessment_id=eq.${encodeURIComponent(queueItem.assessment_id)}`,
          {
            method: 'PATCH',
            body: {
              status: 'failed',
              last_error: errorMsg,
              attempt_count: 1,
              updated_at: new Date().toISOString(),
            },
            serviceRole: true,
          }
        );
      }
    }

    return res.status(200).json({
      success: true,
      processed: queueItems.length,
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
      failed: 0,
      error: errorMsg,
    });
  }
}
