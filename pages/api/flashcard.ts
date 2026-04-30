import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedUser, supabaseRest } from '../../lib/supabase/api';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import type { StrategicQuestion } from '../../types/dashboard';

function strategicQuestionSeverity(priority: number): StrategicQuestion['severity'] {
  if (priority <= 3) return 'high';
  if (priority <= 6) return 'medium';
  return 'low';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await getAuthenticatedUser(req, res);
  if (!auth.ok) {
    return res.status(auth.status ?? 401).json({ error: auth.error ?? 'Não autenticado.' });
  }

  const supabase = createSupabaseServerClient(req, res);
  const user = auth.user;

  if (req.method === 'GET') {
    const { data: questions, error } = await supabase
      .from('strategic_next_questions')
      .select('id, question_text, question_goal, dimension_key, priority, expected_unlock, briefing_field_key')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('priority', { ascending: true })
      .limit(10);

    if (error) return res.status(500).json({ error: error.message });

    const pending = (questions || [])
      .map((question) => ({
        ...question,
        severity: strategicQuestionSeverity(question.priority),
      }));

    return res.status(200).json({ questions: pending });
  }

  if (req.method === 'POST') {
    const { question_id, answer_text } = req.body as {
      question_id: string;
      answer_text: string;
    };

    if (!question_id || !answer_text?.trim()) {
      return res.status(400).json({ error: 'question_id e answer_text sao obrigatorios.' });
    }

    const { data: question } = await supabase
      .from('strategic_next_questions')
      .select('briefing_field_key, dimension_key, question_text')
      .eq('id', question_id)
      .eq('user_id', user.id)
      .single();

    const fieldKey = question?.briefing_field_key ?? `flashcard.${question_id}`;

    const { data: insertedResponse, error: insertError } = await supabase
      .from('brand_context_responses')
      .insert({
        user_id: user.id,
        form_type: 'strategic_question',
        field_key: fieldKey,
        value_text: answer_text.trim(),
        response_status: 'active',
        answer_type: 'strategic',
        source_question_id: question_id,
        value_json: {
          question_id,
          dimension_key: question?.dimension_key,
          question_text: question?.question_text,
          source: 'flashcard',
        },
      })
      .select('id')
      .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    // Corrigido: a tabela strategic_next_questions não possui política RLS para UPDATE.
    // Usamos a Service Role Key via supabaseRest para contornar a restrição.
    const updateRes = await supabaseRest(
      `/rest/v1/strategic_next_questions?id=eq.${encodeURIComponent(question_id)}&user_id=eq.${encodeURIComponent(user.id)}`,
      {
        method: 'PATCH',
        body: {
          status: 'answered',
          answered_at: new Date().toISOString(),
          answer_response_id: insertedResponse?.id ?? null,
        },
        serviceRole: true,
      }
    );

    if (!updateRes.response.ok) {
      return res.status(500).json({ error: 'Falha ao atualizar status da pergunta.' });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
