import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildDashboardNextAction,
  calcAgentReadiness,
  isAgentUnlocked,
  resolveDashboardStage,
} from '../../lib/domain/agentReadiness';
import { buildDashboardOverview, buildPipelineMonitor } from '../../lib/server/dashboardData';
import {
  extractErrorMessage,
  getAuthenticatedUser,
  supabaseRest,
} from '../../lib/supabase/api';
import type { DashboardPayload, StrategicQuestion } from '../../types/dashboard';

function strategicQuestionSeverity(priority: number): StrategicQuestion['severity'] {
  if (priority <= 3) return 'high';
  if (priority <= 6) return 'medium';
  return 'low';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardPayload | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = await getAuthenticatedUser(req, res);
  if (!auth.ok) {
    return res.status(auth.status ?? 401).json({ error: auth.error ?? 'Não autenticado.' });
  }

  const userId = auth.user.id;
  const encoded = encodeURIComponent(userId);

  try {
    const [profileRes, attachmentsRes, tokensRes, strategicQuestionsRes, pipelineMonitor] =
      await Promise.all([
        supabaseRest(`/rest/v1/user_profiles?id=eq.${encoded}&select=*&limit=1`),
        supabaseRest(`/rest/v1/user_attachments?user_id=eq.${encoded}&select=*&order=created_at.desc`),
        supabaseRest(
          `/rest/v1/gpt_access_tokens?user_id=eq.${encoded}&select=id,label,token_prefix,token_value,status,created_at,last_used_at,expires_at,revoked_at&order=created_at.desc`
        ),
        supabaseRest(
          `/rest/v1/strategic_next_questions?user_id=eq.${encoded}&status=eq.active&select=id,question_text,question_goal,dimension_key,priority,expected_unlock&order=priority.asc&limit=10`
        ),
        buildPipelineMonitor(userId),
      ]);

    if (!profileRes.response.ok) {
      throw new Error(extractErrorMessage(profileRes.data, 'Falha ao carregar perfil.'));
    }
    if (!attachmentsRes.response.ok) {
      throw new Error(extractErrorMessage(attachmentsRes.data, 'Falha ao carregar anexos.'));
    }
    if (!tokensRes.response.ok) {
      throw new Error(extractErrorMessage(tokensRes.data, 'Falha ao carregar tokens.'));
    }
    if (!strategicQuestionsRes.response.ok) {
      throw new Error(
        extractErrorMessage(strategicQuestionsRes.data, 'Falha ao carregar perguntas estratégicas.')
      );
    }

    const profile = (Array.isArray(profileRes.data) && profileRes.data[0]) || {};
    const attachments = Array.isArray(attachmentsRes.data) ? attachmentsRes.data : [];
    const gptTokens = Array.isArray(tokensRes.data) ? tokensRes.data : [];
    const strategicQuestions: StrategicQuestion[] = Array.isArray(strategicQuestionsRes.data)
      ? strategicQuestionsRes.data.map((question) => ({
          id: String(question.id),
          question_text: String(question.question_text ?? ''),
          question_goal:
            typeof question.question_goal === 'string' ? question.question_goal : null,
          dimension_key:
            typeof question.dimension_key === 'string' ? question.dimension_key : null,
          priority: Number(question.priority ?? 0),
          expected_unlock:
            typeof question.expected_unlock === 'string' ? question.expected_unlock : null,
          severity: strategicQuestionSeverity(Number(question.priority ?? 0)),
        }))
      : [];

    const agentReadiness = calcAgentReadiness(pipelineMonitor.summary);
    const agentUnlocked = isAgentUnlocked(agentReadiness);
    const dashboardStage = resolveDashboardStage(pipelineMonitor.summary, attachments.length);
    const hasActiveToken = Boolean(
      gptTokens.find((token) => token.status === 'active' && token.token_value)
    );
    const nextAction = buildDashboardNextAction({
      stage: dashboardStage,
      strategicQuestionCount: strategicQuestions.length,
      agentUnlocked,
      hasActiveToken,
    });
    const overview = await buildDashboardOverview(userId, pipelineMonitor, strategicQuestions);

    return res.status(200).json({
      user: { id: userId, email: auth.user.email },
      profile,
      attachments,
      gpt_tokens: gptTokens,
      legacy_documents: [],
      pipeline_monitor: pipelineMonitor,
      strategic_questions: strategicQuestions,
      strategic_question_count: strategicQuestions.length,
      agent_readiness: agentReadiness,
      agent_unlocked: agentUnlocked,
      dashboard_stage: dashboardStage,
      next_action: nextAction,
      overview,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro interno ao carregar dados.' });
  }
}
