# Auditoria e Plano de Depuração — Dashboard Planttô

> **Data:** 28 de abril de 2026  
> **Escopo:** Desalinhamento entre dados reais do banco Supabase e o que é exibido no dashboard  
> **Objetivo:** Tornar a leitura dos dados mais clara, confiável e acionável

---

## Arquitetura de Dados (fluxo atual)

```
Banco Supabase
     ↓
pages/api/get.ts  ←── buildPipelineMonitor()
     ↓
useDashboardData.ts (hook)
     ↓
dashboard.tsx (página)
     ↓
PipelineMonitorPanel.tsx (componente visual)
```

> ⚠️ O dashboard visual com radar de conhecimento, mapa estratégico e plataforma de marca está sendo servido localmente com código **não commitado**. O repositório contém apenas: Pipeline, Perfil, Documentos GPT, Conhecimento e Token GPT.

---

## Problemas Identificados

### 🔴 Bug 1 — `BRIEFING_TOTAL` hardcoded como `28`

**Arquivo:** `pages/api/get.ts` — linha ~39

```typescript
// CÓDIGO ATUAL — ERRADO
const BRIEFING_TOTAL = 28;
```

O total de perguntas de briefing está **fixo no código**, não vem do banco. Se perguntas forem adicionadas ou removidas da tabela `brand_context_questions`, o dashboard nunca refletirá isso.

**Correção:**

```typescript
const totalRes = await supabaseRest(
  `/rest/v1/brand_context_questions?user_id=eq.${encoded}&select=id`
);
const BRIEFING_TOTAL = totalRes.response.ok && Array.isArray(totalRes.data)
  ? totalRes.data.length
  : 28; // fallback seguro
```

---

### 🔴 Bug 2 — `branding_models_total` com valor inconsistente (`4` no hook, `7` na API)

**Arquivo 1:** `hooks/useDashboardData.ts` — linha ~22  
**Arquivo 2:** `pages/api/get.ts` — linha ~95

```typescript
// hook — estado inicial
branding_models_total: 4,  // ← ERRADO

// API — retorno real
branding_models_total: 7,  // ← CORRETO
```

Durante o carregamento, o usuário vê `X/4`. Ao receber a resposta da API, pula para `X/7`. Isso causa flickering visual e inconsistência.

**Correção:** Criar uma constante compartilhada:

```typescript
// lib/domain/constants.ts
export const BRANDING_MODELS_TOTAL = 7;
export const BRIEFING_TOTAL_FALLBACK = 28;
```

E importar nos dois arquivos.

---

### 🔴 Bug 3 — `briefing_pending` com lógica redundante

**Arquivo:** `pages/api/get.ts` — linha ~89

```typescript
// CÓDIGO ATUAL — lógica morta no else
briefing_pending: briefingPending > 0
  ? briefingPending
  : Math.max(0, briefingTotal - briefingAnswered),
```

A expressão no `else` é matematicamente idêntica ao próprio `briefingPending`. É código morto.

**Correção:**

```typescript
briefing_pending: Math.max(0, BRIEFING_TOTAL - briefingAnswered),
```

---

### 🟡 Bug 4 — Nenhuma query para tabelas estratégicas no `get.ts`

**Arquivo:** `pages/api/get.ts`

O endpoint `/api/get` **não busca** as tabelas mais importantes:

| Tabela | Status | Impacto |
|---|---|---|
| `strategic_assessments` | ❌ Ausente | Score de maturidade nunca chega ao frontend |
| `strategic_gaps` | ❌ Ausente | Gaps identificados nunca aparecem |
| `strategic_next_questions` | ❌ Ausente | Perguntas prioritárias nunca aparecem |
| `plataforma_marca` | ⚠️ Parcial | Busca só `model_key` sem `status` nem conteúdo |

**Correção — adicionar ao `buildPipelineMonitor` ou em endpoint dedicado:**

```typescript
const [assessmentRes, gapsRes, nextQuestionsRes] = await Promise.all([
  supabaseRest(
    `/rest/v1/strategic_assessments?user_id=eq.${encoded}&select=overall_score,status,generated_at&order=generated_at.desc&limit=1`
  ),
  supabaseRest(
    `/rest/v1/strategic_gaps?user_id=eq.${encoded}&status=eq.active&select=gap_title,severity&order=severity`
  ),
  supabaseRest(
    `/rest/v1/strategic_next_questions?user_id=eq.${encoded}&status=eq.active&select=question_text,dimension_key,priority&order=priority&limit=3`
  ),
]);
```

---

### 🟡 Bug 5 — `DashboardPayload` sem campos para dados estratégicos

**Arquivo:** `types/dashboard.ts`

Mesmo que as queries sejam adicionadas, o TypeScript vai rejeitar os novos campos pois o type `DashboardPayload` não os declara.

**Correção — expandir o type:**

```typescript
export interface DashboardPayload {
  // campos existentes...
  assessment?: {
    overall_score: number;
    status: string;
    generated_at: string;
  } | null;
  strategic_gaps?: Array<{
    gap_title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }>;
  next_questions?: Array<{
    question_text: string;
    dimension_key: string;
    priority: number;
  }>;
  plataforma_marca?: Array<{
    model_key: string;
    status: string;
  }>;
}
```

---

### 🟡 Bug 6 — Badge "0 em processamento" sempre renderizado

**Arquivo:** `components/dashboard/PipelineMonitorPanel.tsx` — linha ~113

```tsx
// ATUAL — sempre mostra, mesmo zerado
<span style={styles.countBadge}>{summary.processing_items} em processamento</span>
```

**Correção:**

```tsx
{summary.processing_items > 0 && (
  <span style={styles.countBadge}>{summary.processing_items} em processamento</span>
)}
```

---

### 🟡 Bug 7 — Cards de briefing duplicados no `PipelineMonitorPanel`

**Arquivo:** `components/dashboard/PipelineMonitorPanel.tsx` — linhas ~72–80

"Briefing respondidas" e "Briefing pendentes" são dois cards separados com a mesma informação. Isso ocupa espaço e força o usuário a fazer a conta mentalmente.

**Correção — substituir por barra de progresso:**

```tsx
const pct = Math.round((summary.briefing_answered / summary.briefing_total) * 100);

// Renderizar:
// "Briefing: 5/28 respondidos (18%)"
// [████░░░░░░░░░░░░░░░░] 18%
```

---

## Ordem de Execução Sugerida

| # | Prioridade | Arquivo | Ação |
|---|---|---|---|
| 1 | 🔴 Crítico | `pages/api/get.ts` | Adicionar queries para `strategic_assessments`, `strategic_gaps`, `strategic_next_questions` |
| 2 | 🔴 Crítico | `types/dashboard.ts` | Expandir `DashboardPayload` com novos campos |
| 3 | 🔴 Crítico | `hooks/useDashboardData.ts` | Adicionar state para `assessment`, `gaps`, `nextQuestions` |
| 4 | 🔴 Crítico | `pages/api/get.ts` + `hooks/useDashboardData.ts` | Unificar constantes em `lib/domain/constants.ts` |
| 5 | 🟡 Importante | `components/dashboard/PipelineMonitorPanel.tsx` | Ocultar badge zerado + unificar cards de briefing em barra de progresso |
| 6 | 🟡 Importante | `pages/dashboard.tsx` | Criar seção de Gaps + Assessment Score + card de Próxima Ação |
| 7 | 🟢 Melhoria | `pages/dashboard.tsx` | Ordenar plataforma de marca por impacto estratégico |

---

## O que o dashboard deve comunicar (visão alvo)

```
┌─────────────────────────────────────────────────────┐
│  ESTADO GERAL                                        │
│  Score de maturidade + status + data do assessment  │
├─────────────────────────────────────────────────────┤
│  PRÓXIMA AÇÃO (1 card de destaque)                  │
│  "23 perguntas de briefing pendentes →              │
│   Converse com o agente para responder"             │
├─────────────────────────────────────────────────────┤
│  LACUNAS ATIVAS                                     │
│  • Falta formalização de provas sociais — HIGH      │
│  • Segmentação do público pode ser aprofundada — MEDIUM │
├─────────────────────────────────────────────────────┤
│  CONHECIMENTO DE MARCA                              │
│  Radar de dimensões + barra de progresso 5/28 (18%) │
├─────────────────────────────────────────────────────┤
│  PLATAFORMA DE MARCA                                │
│  7/7 gerado — Propósito → Posicionamento → ...      │
├─────────────────────────────────────────────────────┤
│  PIPELINE (simplificado)                            │
│  Ocultar quando não há nada em processamento        │
└─────────────────────────────────────────────────────┘
```

---

*Gerado em 28/04/2026 · Planttô Brand Intelligence*
