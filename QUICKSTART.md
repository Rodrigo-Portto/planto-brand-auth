# ⚡ Quick Start - Editorial Pipeline

**Tempo estimado: 5-10 minutos**

## 1️⃣ Preparar Banco de Dados (2 min)

```bash
# Abra Supabase Dashboard
# → SQL Editor
# → Cole tudo de: supabase/migrations/001_editorial_system_pipeline.sql
# → Clique em ▶️ "Execute"
```

✅ Pronto! Trigger, funções e tabelas criadas.

## 2️⃣ Configurar Variáveis (1 min)

Edite `.env.local`:

```env
# Já deve estar
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...

# Adicione
OPENAI_API_KEY=sk-proj-xxxx
EDITORIAL_CRON_TOKEN=seu-token-aleatorio-aqui
```

## 3️⃣ Testar Localmente (2 min)

```bash
npm run dev
npm run editorial:test
```

Espere "X/10 testes passaram ✅"

## 4️⃣ Trigger Manual (para validar)

```bash
# Terminal SQL (Supabase Dashboard)
INSERT INTO strategic_assessments (user_id, assessment_json, status)
SELECT id, '{"score": 75}'::jsonb, 'active' FROM user_profiles LIMIT 1;

# Verificar que job foi enfileirado
SELECT * FROM editorial_generation_queue WHERE status = 'pending';
```

## 5️⃣ Processar Fila (1 min)

```bash
npm run editorial:generate
```

Resposta esperada:
```json
{
  "success": true,
  "processed": 1,
  "generated": 1,
  "failed": 0
}
```

## 6️⃣ Verificar Resultado

```bash
# SQL: Ver entradas criadas
SELECT topic, content_type FROM editorial_system LIMIT 10;
```

## 7️⃣ Deploy Automático (Vercel)

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

Agora roda a cada 6 horas! 🚀

---

## 🆘 Se Algo Não Funcionar

| Erro | Solução |
|------|---------|
| "Tabela não existe" | Reexecute migration no SQL Editor |
| "OpenAI API invalid" | Verifique OPENAI_API_KEY em .env.local |
| "0 testes passaram" | Checklist em DEPLOYMENT_CHECKLIST.md |
| Nenhuma entrada gerada | Veja supabase/EDITORIAL_EXAMPLES.md item 10 |

---

## 📖 Documentação Completa

- `EDITORIAL_SUMMARY.md` - Visão geral
- `EDITORIAL_IMPLEMENTATION.md` - Setup detalhado
- `DEPLOYMENT_CHECKLIST.md` - Validação
- `supabase/EDITORIAL_EXAMPLES.md` - Exemplos + troubleshooting

---

## 🎯 Pronto!

O pipeline está rodando e **automaticamente**:
1. ✅ Detecta novos assessments
2. ✅ Enfileira jobs
3. ✅ Chama OpenAI
4. ✅ Preenche `editorial_system`

**Nenhuma ação manual necessária após o deploy!** 🎉
