# Exemplos de Uso - Pipeline Editorial

## 1. Criar um Strategic Assessment (Trigger)

Quando você cria um novo `strategic_assessment`, o trigger dispara automaticamente:

### Via SQL (Supabase)
```sql
INSERT INTO strategic_assessments (
  id,
  user_id,
  assessment_json,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'seu-user-id-aqui',
  '{
    "overall_score": 75,
    "dimensions": {
      "brand_clarity": 8,
      "market_positioning": 7,
      "content_strategy": 6
    },
    "gaps": ["Define consistent brand voice", "Increase content frequency"],
    "opportunities": ["Expand to new markets", "Build community engagement"]
  }'::jsonb,
  'active',
  NOW(),
  NOW()
);
```

### Via REST (curl)
```bash
curl -X POST \
  https://seu-project.supabase.co/rest/v1/strategic_assessments \
  -H "apikey: seu-anon-key" \
  -H "Authorization: Bearer seu-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "seu-user-id",
    "assessment_json": {
      "overall_score": 75,
      "dimensions": {
        "brand_clarity": 8,
        "market_positioning": 7
      }
    },
    "status": "active"
  }'
```

**O que acontece automaticamente:**
1. ✅ Trigger dispara
2. ✅ Job é enfileirado em `editorial_generation_queue` com status `pending`
3. ⏳ Quando `/api/pipeline/editorial-generate` roda (ou cron executa):
   - Busca jobs pendentes
   - Chama OpenAI
   - Insere em `editorial_system`
   - Marca job como `completed`

---

## 2. Processar Fila Editorial Manualmente

### Via curl (local)
```bash
curl -X POST \
  http://localhost:3000/api/pipeline/editorial-generate \
  -H "Authorization: Bearer seu-token-secreto" \
  -H "Content-Type: application/json"
```

### Via script Node.js
```typescript
import fetch from 'node-fetch';

const response = await fetch(
  'http://localhost:3000/api/pipeline/editorial-generate',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EDITORIAL_CRON_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }
);

const result = await response.json();
console.log(result);
// {
//   "success": true,
//   "processed": 5,
//   "generated": 5,
//   "failed": 0
// }
```

---

## 3. Monitorar a Fila

### Ver jobs pendentes
```sql
SELECT 
  id,
  assessment_id,
  status,
  created_at,
  last_error
FROM editorial_generation_queue
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Ver histórico de gerações
```sql
SELECT 
  assessment_id,
  status,
  attempt_count,
  updated_at,
  last_error
FROM editorial_generation_queue
ORDER BY updated_at DESC
LIMIT 20;
```

### Ver entradas geradas por assessment
```sql
SELECT 
  assessment_id,
  COUNT(*) as entry_count,
  json_agg(
    json_build_object(
      'topic', topic,
      'content_type', content_type,
      'suggested_platforms', suggested_platforms
    )
  ) as entries
FROM editorial_system
GROUP BY assessment_id
ORDER BY created_at DESC;
```

---

## 4. Testar Geração sem Salvar

Para testar o prompt e resposta da OpenAI **sem** salvar em editorial_system:

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prompt = `
Com base na análise estratégica da marca, gere 7-10 LINHAS EDITORIAIS para o calendário futuro.

CONTEXTO DA MARCA:
Marca: Agência de Branding
Nicho: Tecnologia e Startups
Estágio: Crescimento
Serviços: Design e Estratégia Digital
Cliente Ideal: Startups de 5-50 pessoas
Canais Prioritários: LinkedIn, Blog, Newsletter

CONHECIMENTOS CHAVE:
- Brand Identity: Marca deve transmitir confiança e inovação
- Target Audience: Empreendedores que buscam profissionalismo
- Diferencial: Abordagem data-driven

Retorne APENAS um JSON array com formato:
[
  {
    "topic": "título",
    "content": "descrição",
    "suggested_platforms": ["linkedin", "blog"],
    "tone": "Profissional",
    "content_type": "blog"
  }
]
`;

const response = await client.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    {
      role: 'system',
      content: 'Você é um especialista em estratégia de conteúdo.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ],
  temperature: 0.7,
  max_tokens: 2000,
});

const entries = JSON.parse(response.choices[0].message.content || '[]');
console.log('Entradas geradas:');
entries.forEach((entry, i) => {
  console.log(`\n${i + 1}. ${entry.topic}`);
  console.log(`   Tipo: ${entry.content_type}`);
  console.log(`   Plataformas: ${entry.suggested_platforms.join(', ')}`);
  console.log(`   Tone: ${entry.tone}`);
  console.log(`   Conteúdo: ${entry.content}`);
});
```

---

## 5. Debug: Chamar RPC Diretamente

Para verificar o contexto que será enviado para OpenAI:

### Via SQL
```sql
SELECT * FROM get_brand_context_for_editorial('seu-user-id');
```

### Via curl REST
```bash
curl -X POST \
  https://seu-project.supabase.co/rest/v1/rpc/get_brand_context_for_editorial \
  -H "apikey: seu-service-key" \
  -H "Authorization: Bearer seu-service-key" \
  -H "Content-Type: application/json" \
  -d '{"user_id_param": "seu-user-id"}' \
  | jq .
```

**Resposta esperada:**
```json
{
  "user_id": "seu-user-id",
  "brand_knowledge": [
    {
      "id": "knowledge-1",
      "content": "Somos especialistas em branding",
      "form_type": "brand_voice",
      "status": "active"
    },
    ...
  ],
  "user_profile": {
    "name": "Agência XYZ",
    "market_niche": "Tecnologia",
    "business_stage": "crescimento",
    ...
  },
  "recent_assessments": [
    {
      "id": "assessment-1",
      "assessment_json": { ... }
    }
  ]
}
```

---

## 6. Reset Manual da Fila

Se houver jobs travados:

```sql
-- Ver jobs presos (mais de 2 horas em processing)
SELECT id, assessment_id, status, updated_at
FROM editorial_generation_queue
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '2 hours';

-- Resetar para pending
UPDATE editorial_generation_queue
SET status = 'pending', attempt_count = attempt_count + 1
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '2 hours';
```

---

## 7. Limpar Histórico

Para manter o banco limpo:

```sql
-- Remover jobs completados há mais de 30 dias
DELETE FROM editorial_generation_queue
WHERE status = 'completed'
  AND updated_at < NOW() - INTERVAL '30 days';

-- Remover entradas editoriais antigas (manter últimas 6 meses)
DELETE FROM editorial_system
WHERE created_at < NOW() - INTERVAL '6 months'
  AND status != 'pinned';
```

---

## 8. Integração com Webhook (Exemplo Vercel/GitHub)

Se quiser dispara geração quando um novo assessment é enviado via webhook:

```typescript
// pages/api/webhooks/assessment-created.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseRest } from '../../../lib/supabase/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { assessment_id, user_id } = req.body;

  if (!assessment_id || !user_id) {
    return res.status(400).json({ error: 'Missing assessment_id or user_id' });
  }

  try {
    // Enfileira manualmente
    const queueRes = await supabaseRest(
      '/rest/v1/editorial_generation_queue',
      {
        method: 'POST',
        body: {
          assessment_id,
          status: 'pending',
        },
        serviceRole: true,
      }
    );

    if (!queueRes.response.ok) {
      throw new Error(`Failed to enqueue: ${JSON.stringify(queueRes.data)}`);
    }

    // Dispara processamento assincronamente (fire and forget)
    fetch(
      `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/pipeline/editorial-generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.EDITORIAL_CRON_TOKEN || ''}`,
        },
      }
    ).catch((err) => {
      console.error('Error triggering editorial generation:', err);
    });

    return res.status(202).json({
      message: 'Assessment enqueued for editorial generation',
      assessment_id,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: err });
  }
}
```

---

## 9. Formato Esperado de Entradas Editoriais

Quando o OpenAI responde, o formato esperado é:

```json
[
  {
    "topic": "5 tendências de design 2024",
    "content": "Análise das principais tendências visuais que vão dominar o mercado de design em 2024, desde minimalismo até IA generativa.",
    "suggested_platforms": ["blog", "linkedin", "instagram"],
    "tone": "Educativo e inspirador",
    "content_type": "blog"
  },
  {
    "topic": "Case study: Rebranding bem-sucedido",
    "content": "Estudo de caso de uma marca que passou por rebranding completo e os resultados obtidos...",
    "suggested_platforms": ["blog", "linkedin"],
    "tone": "Profissional",
    "content_type": "case_study"
  }
]
```

**Campos:**
- `topic`: Título da linha editorial
- `content`: Descrição breve do que será criado
- `suggested_platforms`: Onde publicar (blog, linkedin, instagram, tiktok, youtube, newsletter, email, evento, etc)
- `tone`: Tom de voz (Profissional, Casual, Educativo, Inspirador, Técnico, etc)
- `content_type`: Tipo (blog, video, social, infografic, case_study, guia, template, webinar, podcast, etc)

---

## 10. Troubleshooting: Nenhuma Entrada é Gerada

**Checklist:**

1. ✅ Existe `strategic_assessment` criado? (verifique a tabela)
   ```sql
   SELECT COUNT(*) FROM strategic_assessments WHERE user_id = 'seu-user-id';
   ```

2. ✅ Existe job pendente?
   ```sql
   SELECT COUNT(*) FROM editorial_generation_queue WHERE status = 'pending';
   ```

3. ✅ Brand knowledge está preenchido?
   ```sql
   SELECT COUNT(*) FROM brand_knowledge WHERE user_id = 'seu-user-id' AND status = 'active';
   ```

4. ✅ Profile está preenchido com pelo menos `market_niche`?
   ```sql
   SELECT * FROM user_profiles WHERE id = 'seu-user-id';
   ```

5. ✅ OpenAI API key é válido?
   ```bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
   ```

6. ✅ Logs da função (Supabase Dashboard → Functions → Logs)

7. ✅ Ver erro específico:
   ```sql
   SELECT last_error FROM editorial_generation_queue WHERE status = 'failed' ORDER BY updated_at DESC LIMIT 1;
   ```
