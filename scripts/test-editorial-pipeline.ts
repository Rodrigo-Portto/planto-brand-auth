/**
 * Script de teste para o pipeline editorial
 *
 * Uso:
 *   npx ts-node scripts/test-editorial-pipeline.ts
 *
 * Ou adicione ao package.json:
 *   "test:editorial": "ts-node scripts/test-editorial-pipeline.ts"
 */

import fetch from 'node-fetch';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];

async function test(
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  try {
    console.log(`\n📋 ${name}...`);
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: err });
    console.error(`❌ ${name}: ${err}`);
  }
}

// Configurar variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const API_URL = process.env.API_URL || 'http://localhost:3000';
const EDITORIAL_CRON_TOKEN = process.env.EDITORIAL_CRON_TOKEN || '';

async function apiCall(
  path: string,
  method: string = 'GET',
  body?: unknown
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (EDITORIAL_CRON_TOKEN) {
    headers['Authorization'] = `Bearer ${EDITORIAL_CRON_TOKEN}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return response;
}

async function supabaseCall(
  path: string,
  method: string = 'GET',
  body?: unknown
): Promise<unknown> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Supabase error: ${JSON.stringify(data)}`);
  }

  return data;
}

async function runTests(): Promise<void> {
  console.log('🧪 Editorial Pipeline Test Suite\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Supabase URL: ${SUPABASE_URL}\n`);

  // Test 1: Verificar variáveis de ambiente
  await test('Variáveis de ambiente configuradas', async () => {
    if (!SUPABASE_URL) throw new Error('SUPABASE_URL não configurado');
    if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY não configurado');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurado');
  });

  // Test 2: Conectar ao Supabase
  let testUserId: string = '';
  await test('Conectar ao Supabase', async () => {
    const data = await supabaseCall('/rest/v1/user_profiles?select=id&limit=1');
    if (!Array.isArray(data)) throw new Error('Resposta inválida do Supabase');
    if (data.length === 0) throw new Error('Nenhum perfil de usuário encontrado');
    testUserId = (data[0] as { id: string }).id;
    console.log(`  → Usuário de teste: ${testUserId}`);
  });

  // Test 3: Verificar tabela editorial_generation_queue
  await test('Tabela editorial_generation_queue existe', async () => {
    const data = await supabaseCall(
      '/rest/v1/editorial_generation_queue?select=count&limit=1'
    );
    console.log(`  → Fila tem ${(data as Record<string, unknown>).count || 0} items`);
  });

  // Test 4: Verificar brand_knowledge para o usuário
  await test('Usuário tem brand_knowledge', async () => {
    const encoded = encodeURIComponent(testUserId);
    const data = await supabaseCall(
      `/rest/v1/brand_knowledge?user_id=eq.${encoded}&select=count`
    );
    const count = (data as Record<string, unknown>).count || 0;
    if (count === 0) console.log('  ⚠️  Nenhum brand_knowledge para este usuário');
    else console.log(`  → ${count} fatos de conhecimento`);
  });

  // Test 5: Verificar user_profile está preenchido
  let hasProfile = false;
  await test('Perfil do usuário está preenchido', async () => {
    const encoded = encodeURIComponent(testUserId);
    const data = await supabaseCall(
      `/rest/v1/user_profiles?id=eq.${encoded}&select=*&limit=1`
    );
    const profile = Array.isArray(data) ? data[0] : null;
    if (!profile) throw new Error('Perfil não encontrado');
    hasProfile = !!(profile as Record<string, unknown>).market_niche;
    if (!hasProfile) {
      console.log('  ⚠️  Perfil vazio - preencha market_niche, business_stage, etc');
    } else {
      console.log('  → Perfil preenchido');
    }
  });

  // Test 6: Buscar strategic_assessments
  let testAssessmentId: string = '';
  await test('Buscar strategic_assessments', async () => {
    const encoded = encodeURIComponent(testUserId);
    const data = await supabaseCall(
      `/rest/v1/strategic_assessments?user_id=eq.${encoded}&select=id&limit=1&order=created_at.desc`
    );
    const assessments = Array.isArray(data) ? data : [];
    if (assessments.length === 0) {
      console.log('  ⚠️  Nenhum assessment encontrado');
    } else {
      testAssessmentId = (assessments[0] as { id: string }).id;
      console.log(`  → ${assessments.length} assessments encontrados`);
      console.log(`  → Usando assessment: ${testAssessmentId}`);
    }
  });

  // Test 7: Chamar RPC get_brand_context_for_editorial
  let brandContext: unknown = null;
  await test('RPC get_brand_context_for_editorial funciona', async () => {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_brand_context_for_editorial`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ user_id_param: testUserId }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.log('  ⚠️  RPC retornou erro:', (data as Record<string, unknown>).message);
    } else {
      brandContext = data;
      const context = data as Record<string, unknown>;
      const knowledge = Array.isArray(context.brand_knowledge) ? context.brand_knowledge : [];
      console.log(`  → ${knowledge.length} fatos de conhecimento`);
    }
  });

  // Test 8: Chamar API de geração editorial
  let apiWorking = true;
  await test('API /api/pipeline/editorial-generate responde', async () => {
    try {
      const response = await apiCall('/api/pipeline/editorial-generate', 'POST');
      if (response.status === 405) {
        throw new Error('Método não permitido (verifique se está em POST)');
      }
      if (response.status === 401) {
        throw new Error('Não autorizado (verifique EDITORIAL_CRON_TOKEN)');
      }
      if (!response.ok && response.status !== 200) {
        const data = await response.json();
        throw new Error(`Status ${response.status}: ${JSON.stringify(data)}`);
      }
      const data = await response.json();
      console.log(`  → Resposta: ${JSON.stringify(data)}`);
    } catch (error) {
      apiWorking = false;
      throw error;
    }
  });

  // Test 9: OpenAI API key é válido
  await test('OpenAI API key é válido', async () => {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API key inválido (status ${response.status})`);
    }
    console.log('  → API key válido');
  });

  // Test 10: Editorial system table existe
  await test('Tabela editorial_system existe e está acessível', async () => {
    const data = await supabaseCall('/rest/v1/editorial_system?select=count&limit=1');
    const count = (data as Record<string, unknown>).count || 0;
    console.log(`  → ${count} entradas editoriais registradas`);
  });

  // Summary
  console.log('\n\n📊 Resumo dos Testes\n');
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASSOU' : 'FALHOU';
    console.log(`${icon} ${result.name}: ${status}`);
    if (result.error) {
      console.log(`   Erro: ${result.error}`);
    }
  });

  console.log(`\n${passed}/${total} testes passaram\n`);

  // Recomendações
  if (passed < total) {
    console.log('💡 Recomendações:\n');
    results.forEach((result) => {
      if (!result.passed) {
        switch (result.name) {
          case 'Usuário tem brand_knowledge':
            console.log('   → Use /api/upload ou crie brand_knowledge manualmente');
            break;
          case 'Perfil do usuário está preenchido':
            console.log('   → Acesse o dashboard e preencha os campos do perfil');
            break;
          case 'Buscar strategic_assessments':
            console.log(
              '   → Crie um strategic_assessment (via dashboard ou POST /strategic_assessments)'
            );
            break;
          case 'API /api/pipeline/editorial-generate responde':
            console.log('   → Verifique se o servidor Next.js está rodando (npm run dev)');
            break;
          case 'OpenAI API key é válido':
            console.log('   → Verifique sua OPENAI_API_KEY em .env.local');
            break;
        }
      }
    });
    console.log('');
  }

  if (passed === total) {
    console.log('🚀 Tudo pronto! Você pode rodar:');
    console.log('   npm run test:editorial:generate\n');
  }

  process.exit(passed === total ? 0 : 1);
}

// Executar testes
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
