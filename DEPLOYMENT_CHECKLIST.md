# ✅ Deployment Checklist - Editorial Pipeline

## Fase 1: Setup Inicial

- [ ] **1.1** Revisar `EDITORIAL_IMPLEMENTATION.md`
- [ ] **1.2** Ter `OPENAI_API_KEY` válida
- [ ] **1.3** `.env.local` está configurado com:
  ```env
  SUPABASE_URL=...
  SUPABASE_SERVICE_KEY=...
  OPENAI_API_KEY=...
  EDITORIAL_CRON_TOKEN=...
  ```

## Fase 2: Banco de Dados

- [ ] **2.1** Executar migration SQL:
  ```sql
  -- Supabase Dashboard → SQL Editor
  -- Cole: supabase/migrations/001_editorial_system_pipeline.sql
  -- Execute
  ```

- [ ] **2.2** Verificar que tabela `editorial_generation_queue` foi criada:
  ```sql
  SELECT table_name FROM information_schema.tables WHERE table_name = 'editorial_generation_queue';
  ```

- [ ] **2.3** Verificar que função PostgreSQL foi criada:
  ```sql
  SELECT proname FROM pg_proc WHERE proname = 'generate_editorial_entries_on_assessment';
  ```

- [ ] **2.4** Verificar que trigger foi criado:
  ```sql
  SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trigger_generate_editorial_on_new_assessment';
  ```

## Fase 3: Dados Iniciais

- [ ] **3.1** Há pelo menos um usuário com `user_profiles` preenchido:
  ```sql
  SELECT COUNT(*) FROM user_profiles WHERE market_niche IS NOT NULL;
  ```

- [ ] **3.2** Há pelo menos um assessment criado:
  ```sql
  SELECT COUNT(*) FROM strategic_assessments;
  ```

- [ ] **3.3** Se não houver, criar um de teste:
  ```sql
  INSERT INTO strategic_assessments (user_id, assessment_json, status)
  SELECT id, '{"score": 75}'::jsonb, 'active' FROM user_profiles LIMIT 1;
  ```

- [ ] **3.4** Verificar que job foi enfileirado (trigger funcionou):
  ```sql
  SELECT COUNT(*) FROM editorial_generation_queue WHERE status = 'pending';
  ```

## Fase 4: Testes Locais

- [ ] **4.1** Servidor dev rodando: `npm run dev`
- [ ] **4.2** Executar suite de testes:
  ```bash
  npm run editorial:test
  ```
  Esperar: `X/10 testes passaram`

- [ ] **4.3** Se houver falhas, corrigir baseado na mensagem
  - RPC não existe? → Reexecute migration
  - OpenAI API inválida? → Verifique OPENAI_API_KEY
  - Sem brand_knowledge? → Crie alguns registros

- [ ] **4.4** Disparar geração manualmente:
  ```bash
  npm run editorial:generate
  ```
  Esperar resposta com status `success: true`

- [ ] **4.5** Verificar entradas foram criadas:
  ```sql
  SELECT COUNT(*) FROM editorial_system;
  ```
  Deve haver +0 registros (sucesso)

## Fase 5: Deploy em Produção

### Opção A: Vercel Cron (Recomendado)

- [ ] **5A.1** Ter `vercel.json` com cron configurado:
  ```json
  {
    "crons": [{
      "path": "/api/pipeline/editorial-generate",
      "schedule": "0 */6 * * *"
    }]
  }
  ```

- [ ] **5A.2** Fazer push para GitHub
- [ ] **5A.3** Vercel redeploy automático
- [ ] **5A.4** Verificar em Vercel Dashboard → Settings → Crons
  - Status deve ser "Active"

### Opção B: Supabase Edge Function

- [ ] **5B.1** Instalar Supabase CLI:
  ```bash
  npm install -g supabase
  ```

- [ ] **5B.2** Deploy função:
  ```bash
  supabase functions deploy generate-editorial-entries \
    --project-ref seu-project-id
  ```

- [ ] **5B.3** Configurar env vars no Supabase Dashboard:
  - OPENAI_API_KEY
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY

- [ ] **5B.4** Testar webhook:
  ```bash
  curl -X POST https://seu-project.supabase.co/functions/v1/generate-editorial-entries \
    -H "Authorization: Bearer seu-anon-key"
  ```

## Fase 6: Monitoramento Pós-Deploy

- [ ] **6.1** Após 6 horas (ou 1ª execução de cron):
  - Verificar se jobs foram processados:
    ```sql
    SELECT COUNT(*) as completed FROM editorial_generation_queue 
    WHERE status = 'completed';
    ```

- [ ] **6.2** Verificar se há erros:
  ```sql
  SELECT assessment_id, last_error FROM editorial_generation_queue 
  WHERE status = 'failed' LIMIT 3;
  ```

- [ ] **6.3** Se houver falhas, debugar:
  - Ver logs do Vercel Cron ou Supabase Edge Function
  - Corrigir env vars se necessário

- [ ] **6.4** Contar entradas geradas:
  ```sql
  SELECT COUNT(*) as total_entries FROM editorial_system;
  ```
  Deve crescer a cada execução

## Fase 7: Integração Frontend (Opcional)

- [ ] **7.1** Adicionar endpoint para buscar entradas:
  ```typescript
  // pages/api/dashboard/editorial-entries.ts
  const entries = await supabaseRest(
    `/rest/v1/editorial_system?user_id=eq.${userId}&order=created_at.desc`
  );
  ```

- [ ] **7.2** Exibir no dashboard:
  - "Próximas Ideias de Conteúdo"
  - Filtrar por `content_type` ou `suggested_platforms`

- [ ] **7.3** Adicionar ações:
  - "Aceitar e adicionar ao calendário"
  - "Regenerar"
  - "Editar"

## Fase 8: Otimizações

- [ ] **8.1** Se volume crescer (100+ assessments):
  - Aumentar `max_tokens` em prompts
  - Considerar batch processing
  - Cache contexto da marca

- [ ] **8.2** Se custo OpenAI for alto:
  - Trocar para `gpt-3.5-turbo` (10x mais barato)
  - Gerar apenas 3-5 entradas em vez de 7-10
  - Usar prompt cache se disponível

- [ ] **8.3** Se performance degradar:
  - Adicionar índices em `editorial_system.assessment_id`
  - Limpar registros antigos com:
    ```sql
    DELETE FROM editorial_generation_queue WHERE updated_at < NOW() - INTERVAL '90 days';
    DELETE FROM editorial_system WHERE created_at < NOW() - INTERVAL '1 year';
    ```

## Fase 9: Documentação

- [ ] **9.1** Documentar decisões:
  - Por que Vercel Cron vs Edge Function?
  - Qual modelo OpenAI usar?
  - Frequência de execução?

- [ ] **9.2** Criar runbooks:
  - Como resetar fila se travar?
  - Como aumentar geração?
  - Como desabilitar temporariamente?

- [ ] **9.3** Treinar time:
  - Mostrar como usar `editorial_system` no dashboard
  - Explicar formato das entradas
  - Como acompanhar performance

## Troubleshooting Rápido

| Sintoma | Causa Provável | Solução |
|---------|---|----------|
| Nenhuma entrada gerada | Migration não aplicada | Reexecute SQL |
| "Tabela não existe" | Banco não atualizado | Sync Supabase |
| "API key inválido" | OPENAI_API_KEY errada | Verifique .env.local |
| Jobs presos em "processing" | Função travou | Reset: `UPDATE ... SET status = 'pending'` |
| Timeout OpenAI | Prompt muito grande | Reduza quantidade de brand_knowledge |
| Pouquíssimas entradas | Contexto insuficiente | Preencha mais brand_knowledge |

---

**Pronto para Deploy? Marque como concluído! ✅**

Última data de checagem: __________
Responsável: __________
Notas: __________
