# Aplicar Migration - Editorial Pipeline

## ⚠️ IMPORTANTE: A migration ainda NÃO foi aplicada!

Os arquivos foram criados, mas o **banco de dados precisa ser atualizado**.

---

## 2 Formas de Aplicar

### ✅ Opção 1: Via Supabase Dashboard (Mais Fácil)

1. Abra: https://app.supabase.com
2. Acesse seu projeto
3. Vá para: **SQL Editor** (menu esquerdo)
4. Clique em **"New Query"**
5. Copie TODO o conteúdo de:
   ```
   supabase/migrations/001_editorial_system_pipeline.sql
   ```
6. Cole na janela de SQL
7. Clique em ▶️ **"Execute"** (botão azul no canto superior direito)
8. Espere completar ✅

**Esperado:**
- Sem erros
- Mensagem: "Query successful" ou similar
- Tabelas/funções criadas

---

### ✅ Opção 2: Via Supabase CLI (Se tiver instalado)

```bash
# 1. Instalar CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Listar projetos (copie o project-ref)
supabase projects list

# 4. Rodar migration
supabase db push --project-ref seu-project-ref
```

---

## ✔️ Verificar se Funcionou

Após executar, rode estas queries no SQL Editor para confirmar:

### Query 1: Tabela existe?
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'editorial_generation_queue';
```

**Esperado:** Uma linha com `editorial_generation_queue`

### Query 2: Função existe?
```sql
SELECT proname 
FROM pg_proc 
WHERE proname = 'generate_editorial_entries_on_assessment';
```

**Esperado:** Uma linha com `generate_editorial_entries_on_assessment`

### Query 3: RPC existe?
```sql
SELECT proname 
FROM pg_proc 
WHERE proname = 'get_brand_context_for_editorial';
```

**Esperado:** Uma linha com `get_brand_context_for_editorial`

### Query 4: Trigger existe?
```sql
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_generate_editorial_on_new_assessment';
```

**Esperado:** Uma linha com `trigger_generate_editorial_on_new_assessment`

---

## ❌ Se Houver Erro

Erros comuns e soluções:

### "Permission denied"
- Você está usando a conta correta?
- Precisa ser role `postgres` ou `service_role`

### "Syntax error"
- Copie TODO o arquivo (não parcial)
- Verifique se não há caracteres especiais

### "Already exists"
- Deletar e recriar (a migration é idempotente)
```sql
DROP TABLE IF EXISTS editorial_generation_queue CASCADE;
DROP FUNCTION IF EXISTS generate_editorial_entries_on_assessment CASCADE;
-- Depois cole a migration novamente
```

### "Function X not found when executing trigger"
- A ordem importa! Certifique-se de executar o arquivo INTEIRO
- Não execute só partes

---

## ✅ Próximo Passo

Após aplicar com sucesso:

```bash
# 1. Rode os testes
npm run editorial:test

# 2. Se tudo passar, pronto! ✅
```

---

**Precisa de ajuda? Verifique os 4 queries de validação acima.**
