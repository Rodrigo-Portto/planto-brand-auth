# 📋 Pipeline Editorial Automático - Guia de Implementação

## O que foi criado

Um sistema **100% automatizado** que preenche a tabela `editorial_system` com sugestões de conteúdo quando um `strategic_assessment` é criado.

**Componentes:**
- ✅ Função PostgreSQL com trigger automático
- ✅ Fila de processamento em tempo real
- ✅ Edge Function (Supabase) ou API (Next.js)
- ✅ Integração com OpenAI para geração inteligente
- ✅ Scripts de teste e debug

---

## Arquivos Criados

```
supabase/
├── migrations/
│   └── 001_editorial_system_pipeline.sql        # Funções, triggers, fila
├── functions/
│   └── generate-editorial-entries/
│       ├── index.ts                            # Edge Function (Deno)
│       └── deno.json
├── EDITORIAL_PIPELINE.md                       # Documentação técnica
└── EDITORIAL_EXAMPLES.md                       # Exemplos e troubleshooting

pages/api/pipeline/
└── editorial-generate.ts                       # API Next.js (alternativa)

scripts/
├── setup-editorial-pipeline.sh                 # Setup inicial
└── test-editorial-pipeline.ts                  # Suite de testes

EDITORIAL_IMPLEMENTATION.md                     # Este arquivo
```

---

## Como Funciona (Fluxo)

### 1. **Disparo Automático**
```
Você cria um strategic_assessment
    ↓
Trigger PostgreSQL dispara
    ↓
Enfileira em editorial_generation_queue
```

### 2. **Processamento**
```
Job fica pendente na fila
    ↓
/api/pipeline/editorial-generate roda (via cron, webhook ou manual)
    ↓
Busca contexto da marca (brand_knowledge + perfil)
    ↓
Chama OpenAI com prompt estruturado
    ↓
Insere 7-10 linhas em editorial_system
```

### 3. **Resultado**
```
editorial_system tem entradas prontas para:
- Calendário editorial
- Planejamento de conteúdo
- Sugestões automáticas no dashboard
```

---

## Instruções de Setup

### Passo 1: Aplicar Migrations

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Vá para: **SQL Editor**
3. Copie o conteúdo de `supabase/migrations/001_editorial_system_pipeline.sql`
4. Cole na janela de SQL
5. Execute (clique em ▶️)

**Esperado:**
- Função `generate_editorial_entries_on_assessment` criada
- Função `get_brand_context_for_editorial` criada
- Tabela `editorial_generation_queue` criada
- Trigger `trigger_generate_editorial_on_new_assessment` criado
- Índices criados

### Passo 2: Configurar Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# Já devem estar preenchidas
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Adicione:
OPENAI_API_KEY=sk-proj-...
EDITORIAL_CRON_TOKEN=seu-token-secreto-aleatorio
```

### Passo 3: Escolher Como Processar

**Opção A: Cron (Vercel) - RECOMENDADO**

Adicione ao `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/pipeline/editorial-generate",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Isso roda a cada 6 horas. [Docs](https://vercel.com/docs/crons)

**Opção B: Edge Function (Supabase)**

```bash
npm install -g supabase

supabase functions deploy generate-editorial-entries \
  --project-ref seu-project-id
```

Depois configure as env vars no Supabase Dashboard.

**Opção C: Manual (Teste/Debug)**

```bash
npm run dev
npm run editorial:generate
```

### Passo 4: Testar

```bash
# Instale ts-node se não tiver
npm install -D ts-node node-fetch

# Execute os testes
npm run editorial:test
```

Isso verifica:
- ✅ Conexão com Supabase
- ✅ Dados do usuário
- ✅ RPC da função PostgreSQL
- ✅ API endpoint
- ✅ OpenAI API key

---

## Trigger Manual (para testes)

Se quiser disparar manualmente sem esperar o cron:

### Via dashboard do Supabase

```sql
-- 1. Criar um assessment de teste
INSERT INTO strategic_assessments (
  user_id,
  assessment_json,
  status
) VALUES (
  'seu-user-id',
  '{"score": 80, "insights": ["Bem posicionado", "Precisa de mais conteúdo"]}'::jsonb,
  'active'
);

-- 2. Verificar fila preenchida
SELECT * FROM editorial_generation_queue WHERE status = 'pending';

-- 3. Rodar processamento local
```

### Via curl (local dev)

```bash
curl -X POST http://localhost:3000/api/pipeline/editorial-generate \
  -H "Authorization: Bearer $EDITORIAL_CRON_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Monitoramento

### Ver fila pendente

```sql
SELECT assessment_id, status, created_at
FROM editorial_generation_queue
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Ver erros

```sql
SELECT assessment_id, last_error, attempt_count
FROM editorial_generation_queue
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT 5;
```

### Contar entradas geradas

```sql
SELECT COUNT(*) as total_entries
FROM editorial_system;
```

---

## Customização

### Alterar frequência de geração

Em `vercel.json`, mude o schedule:
- `"0 */6 * * *"` = a cada 6 horas
- `"0 * * * *"` = a cada hora
- `"0 9 * * *"` = diariamente às 9am
- `"0 9 * * 1"` = toda segunda às 9am

Referência: [Cron syntax](https://crontab.guru/)

### Customizar prompt do OpenAI

Edite em `pages/api/pipeline/editorial-generate.ts`, função `buildPrompt()`:

```typescript
function buildPrompt(brandContext: Record<string, unknown>): string {
  return `
    [Aqui customize as instruções para OpenAI]
    - Peça por 15 ideias em vez de 7-10
    - Especifique tom diferente
    - Adicione restrições (máx 100 caracteres, etc)
  `;
}
```

### Usar modelo mais barato

Em `pages/api/pipeline/editorial-generate.ts`:

```typescript
// Mude de:
model: 'gpt-4-turbo-preview',

// Para:
model: 'gpt-3.5-turbo',  // 10x mais barato
```

---

## Troubleshooting

### "Tabela não encontrada"

A migration não foi aplicada. Execute novamente:
1. Supabase Dashboard → SQL Editor
2. Cole `001_editorial_system_pipeline.sql`
3. Execute

### "OpenAI API key inválido"

Verifique em `.env.local`:
```bash
# Teste a chave
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models | jq .
```

Se retornar erro 401, a chave está errada.

### "Nenhuma entrada gerada"

Checklist:
1. ✅ Existe `brand_knowledge` ativo?
   ```sql
   SELECT COUNT(*) FROM brand_knowledge 
   WHERE status = 'active' AND user_id = 'seu-user-id';
   ```

2. ✅ Profile preenchido?
   ```sql
   SELECT market_niche, business_stage FROM user_profiles 
   WHERE id = 'seu-user-id';
   ```

3. ✅ Job está pendente?
   ```sql
   SELECT * FROM editorial_generation_queue 
   WHERE status = 'pending';
   ```

4. ✅ Log de erro?
   ```sql
   SELECT last_error FROM editorial_generation_queue 
   WHERE status = 'failed' LIMIT 1;
   ```

---

## Próximos Passos

Após confirmar que está funcionando, você pode:

1. **Adicionar ao Dashboard**
   - Mostrar "Entradas Editoriais Sugeridas" na UI
   - Permitir aceitar/rejeitar sugestões

2. **Feedback Loop**
   - Usuário marca como "boa" → refinar prompt
   - Coletar dados para melhorar geração

3. **Publicação Automática**
   - Integrar com Calendário Editorial
   - Sync com Notion/Airtable

4. **Analytics**
   - Rastrear qual tipo de conteúdo funciona melhor
   - Otimizar prompt baseado em performance

5. **Multi-modelo**
   - Usar Claude 3 ou Mistral em paralelo
   - Comparar qualidade

---

## Suporte

Dúvidas? Consulte:
- `supabase/EDITORIAL_PIPELINE.md` - Documentação técnica
- `supabase/EDITORIAL_EXAMPLES.md` - Exemplos práticos
- `scripts/test-editorial-pipeline.ts` - Testes para diagnóstico

---

## Resumo de Custos (estimado/mês)

| Serviço | Uso | Custo |
|---------|-----|-------|
| **Supabase** | Queries RPC | ~$0 (within free tier) |
| **OpenAI** | 7-10 entries × N assessments | $0.10 - $10 (depende do volume) |
| **Vercel Cron** | 4 execuções/dia | Grátis (free tier) |
| **Total** | - | ~$0 - $10 |

💡 Use `gpt-3.5-turbo` para economizar 10x em OpenAI

---

**Status: Pronto para Deploy ✅**
