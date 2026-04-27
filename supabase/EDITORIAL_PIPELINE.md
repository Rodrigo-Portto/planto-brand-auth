# Pipeline Editorial Automático

## Arquitetura

O pipeline editorial é um sistema automático que gera sugestões de conteúdo quando uma análise estratégica (`strategic_assessment`) é criada ou atualizada.

```
strategic_assessments (INSERT/UPDATE)
         ↓
   [TRIGGER] trigger_generate_editorial_on_new_assessment
         ↓
generate_editorial_entries_on_assessment()
         ↓
  editorial_generation_queue (enfileira job)
         ↓
  [Edge Function OU API] /api/pipeline/editorial-generate
         ↓
  get_brand_context_for_editorial() [RPC]
         ↓
  OpenAI API (gera sugestões)
         ↓
  editorial_system (insere linhas)
```

## Componentes

### 1. **Função PostgreSQL: `generate_editorial_entries_on_assessment()`**
   - **Localização**: `supabase/migrations/001_editorial_system_pipeline.sql`
   - **O que faz**: Enfileira um job na tabela `editorial_generation_queue` quando um assessment é criado/atualizado
   - **Acionado por**: Trigger automático do PostgreSQL

### 2. **Tabela: `editorial_generation_queue`**
   - **Finalidade**: Armazena jobs pendentes para processar
   - **Campos**:
     - `id`: UUID do job
     - `assessment_id`: Referência ao assessment que disparou o job
     - `status`: 'pending' → 'processing' → 'completed' ou 'failed'
     - `attempt_count`: Número de tentativas
     - `last_error`: Mensagem de erro se houver
   - **Uso**: Permite processamento assíncrono e rastreabilidade

### 3. **Função PostgreSQL: `get_brand_context_for_editorial()`**
   - **Finalidade**: Buscar todo o contexto da marca necessário para gerar conteúdo
   - **Retorna**: JSON com:
     - `brand_knowledge[]`: Fatos ativos da marca
     - `user_profile`: Dados do perfil (nicho, estágio, serviços, etc.)
     - `recent_assessments[]`: Últimas análises estratégicas
   - **Usado por**: Edge Function e API

### 4. **Edge Function: `supabase/functions/generate-editorial-entries/`**
   - **Linguagem**: TypeScript/Deno
   - **Método**: GET/POST via webhook do Supabase
   - **Fluxo**:
     1. Busca 5 jobs pendentes da fila
     2. Para cada job:
        - Marca como "processing"
        - Busca contexto via RPC `get_brand_context_for_editorial`
        - Chama OpenAI com prompt estruturado
        - Insere entradas em `editorial_system`
        - Marca como "completed" ou "failed"

### 5. **API Next.js: `/pages/api/pipeline/editorial-generate.ts`**
   - **Método**: POST
   - **Autenticação**: Via header Authorization ou token Vercel Cron
   - **Alternativa**: Pode rodar localmente ou como scheduled task
   - **Implementação**: Mesmo fluxo da Edge Function, mas em Node.js

## Configuração

### Pré-requisitos

1. **Variáveis de ambiente** (`.env.local`):
   ```env
   OPENAI_API_KEY=sk-...
   SUPABASE_SERVICE_KEY=eyJ...
   EDITORIAL_CRON_TOKEN=seu-token-secreto (opcional)
   EDITORIAL_GENERATION_TOKEN=seu-token-secreto (opcional)
   ```

2. **Migrations**: Aplicar `001_editorial_system_pipeline.sql` no Supabase

3. **Índices**: Criados automaticamente pela migration

### Deploy da Edge Function (Supabase)

```bash
# Via Supabase CLI
supabase functions deploy generate-editorial-entries \
  --project-ref seu-project-id
```

Depois, via Supabase Dashboard, configure as variáveis de ambiente:
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Acionamento

### Opção 1: Automático (Recomendado)
Quando um `strategic_assessment` é criado, o trigger dispara automaticamente. A fila fica preenchida.

### Opção 2: Via Cron (Vercel)
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/pipeline/editorial-generate",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Executa a geração editorial a cada 6 horas.

### Opção 3: Webhook da Edge Function
```bash
curl -X POST https://seu-project.supabase.co/functions/v1/generate-editorial-entries \
  -H "Authorization: Bearer seu-token" \
  -H "Content-Type: application/json"
```

### Opção 4: Manual (Teste/Debug)
```bash
curl -X POST http://localhost:3000/api/pipeline/editorial-generate \
  -H "Authorization: Bearer seu-token-secreto" \
  -H "Content-Type: application/json"
```

## Fluxo de Dados de Exemplo

### 1. Criar um Assessment
```sql
INSERT INTO strategic_assessments (user_id, assessment_json, status)
VALUES ('user-123', '{"score": 85, "dimensions": [...]}', 'active');
```

### 2. Trigger Dispara Automaticamente
```
Trigger: trigger_generate_editorial_on_new_assessment
├─ Chama: generate_editorial_entries_on_assessment('assessment-id-456')
└─ Enfileira em: editorial_generation_queue
   └─ status: 'pending'
   └─ assessment_id: 'assessment-id-456'
```

### 3. Job é Processado
```
/api/pipeline/editorial-generate (POST)
├─ Busca job: { id: 'job-789', assessment_id: 'assessment-id-456' }
├─ Marca como: 'processing'
├─ RPC get_brand_context_for_editorial('user-123')
│  └─ Retorna: { brand_knowledge, user_profile, recent_assessments }
├─ Chama OpenAI com prompt
│  └─ Retorna: [
│     { topic: "...", content: "...", suggested_platforms: [...], ... },
│     ...
│    ]
├─ Insere em editorial_system (7-10 linhas)
├─ Marca como: 'completed'
└─ editorial_system agora tem entradas prontas para calendário
```

## Monitoramento

### Verificar fila pendente
```sql
SELECT * FROM editorial_generation_queue
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Verificar falhas
```sql
SELECT assessment_id, last_error, attempt_count
FROM editorial_generation_queue
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

### Contar entradas geradas
```sql
SELECT assessment_id, COUNT(*) as entries_count
FROM editorial_system
GROUP BY assessment_id
ORDER BY created_at DESC;
```

### Limpar fila antiga (opcional)
```sql
DELETE FROM editorial_generation_queue
WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '30 days';
```

## Troubleshooting

### Edge Function não executa
1. Verifique se as variáveis de ambiente estão configuradas no Supabase Dashboard
2. Teste com curl: `curl -X POST seu-url-edge-function`
3. Verifique logs em: Supabase Dashboard → Edge Functions → Logs

### OpenAI API retorna erro
1. Valide a chave: `curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models`
2. Verifique quota e rate limits no dashboard OpenAI
3. Veja logs da função para detalhes do erro

### Nenhuma entrada é gerada
1. Verifique se há `brand_knowledge` ativo: `SELECT COUNT(*) FROM brand_knowledge WHERE status = 'active'`
2. Verifique se o perfil da marca está preenchido: `SELECT * FROM user_profiles WHERE id = 'user-id'`
3. Veja a coluna `last_error` em `editorial_generation_queue`

### Muitos jobs "processing" presos
```sql
-- Reseta jobs presos (mais de 2 horas)
UPDATE editorial_generation_queue
SET status = 'pending', updated_at = NOW()
WHERE status = 'processing'
AND updated_at < NOW() - INTERVAL '2 hours';
```

## Custo Estimado

### Supabase
- Queries: Muito baixo (JSON/RPC)
- Storage: Negligenciável

### OpenAI
- ~$0.03-0.05 por entry gerado (gpt-4-turbo)
- 7-10 entries × N assessments = custo variável
- Considere usar `gpt-3.5-turbo` para economizar (~$0.005 por entry)

### Vercel (se usar cron)
- Grátis até 50 execuções/mês
- Pago acima disso (barato)

## Próximos Passos

1. **Persistência**: Adicionar campo `original_assessment_id` em `editorial_system` se quiser histórico de gerações
2. **Cache**: Implementar TTL em `get_brand_context_for_editorial` para evitar queries repetidas
3. **Webhooks**: Notificar usuário quando novas linhas editoriais são geradas
4. **Filtering**: Permitir filtrar por `content_type`, `tone`, `suggested_platforms` na UI
5. **AI Refinement**: Adicionar feedback loop (usuário marca como "bom" → reajustar prompt)
6. **Batch**: Processar múltiplos assessments em uma chamada OpenAI (economia de custos)
