#!/bin/bash

# Script de setup do pipeline editorial
# Uso: ./scripts/setup-editorial-pipeline.sh

set -e

echo "🔧 Configurando pipeline editorial..."
echo ""

# Verificar variáveis de ambiente
echo "✓ Verificando variáveis de ambiente..."

REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_KEY"
  "OPENAI_API_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "❌ Faltam variáveis de ambiente:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "Adicione ao .env.local:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   $var=seu-valor"
  done
  exit 1
fi

echo "✓ Todas as variáveis de ambiente estão configuradas"
echo ""

# Deploy da Edge Function (opcional)
if command -v supabase &> /dev/null; then
  echo "✓ Supabase CLI encontrado"
  echo ""
  echo "Para fazer deploy da edge function:"
  echo "  supabase functions deploy generate-editorial-entries --project-ref seu-project-id"
  echo ""
else
  echo "⚠️  Supabase CLI não encontrado. Instale com:"
  echo "   npm install -g supabase"
  echo ""
fi

# Configurar variáveis no .env.local
if [ ! -f .env.local ]; then
  echo "Criando .env.local..."
  touch .env.local
fi

# Adicionar EDITORIAL_CRON_TOKEN se não existir
if ! grep -q "EDITORIAL_CRON_TOKEN" .env.local; then
  RANDOM_TOKEN=$(openssl rand -hex 32)
  echo "EDITORIAL_CRON_TOKEN=$RANDOM_TOKEN" >> .env.local
  echo "✓ Token de cron gerado: $RANDOM_TOKEN"
fi

echo ""
echo "✅ Setup completo!"
echo ""
echo "Próximos passos:"
echo "  1. Aplicar migrations no Supabase"
echo "  2. Deploy da edge function (se usar)"
echo "  3. Testar com: npm run test:editorial"
echo ""
