import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../lib/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (supabase, user) => {
    if (req.method === 'GET') {
      const { data: questions, error } = await supabase
        .from('strategic_next_questions')
        .select('id, question_text, question_goal, dimension_key, priority, expected_unlock, briefing_field_key')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('priority', { ascending: true })
        .limit(10);

      if (error) return res.status(500).json({ error: error.message });

      const { data: answered } = await supabase
        .from('brand_context_responses')
        .select('metadata_json')
        .eq('user_id', user.id)
        .eq('form_type', 'strategic_question')
        .not('metadata_json', 'is', null);

      const answeredIds = new Set(
        (answered || [])
          .map((r) => (r.metadata_json as Record<string, string>)?.question_id)
          .filter(Boolean)
      );

      const pending = (questions || [])
        .filter((q) => !answeredIds.has(q.id))
        .map((q) => ({
          ...q,
          severity: q.priority <= 3 ? 'high' : q.priority <= 6 ? 'medium' : 'low',
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

      const { error: insertError } = await supabase
        .from('brand_context_responses')
        .insert({
          user_id: user.id,
          form_type: 'strategic_question',
          field_key: fieldKey,
          field_value: answer_text.trim(),
          response_status: 'active',
          metadata_json: {
            question_id,
            dimension_key: question?.dimension_key,
            question_text: question?.question_text,
            source: 'flashcard',
          },
        });

      if (insertError) return res.status(500).json({ error: insertError.message });

      await supabase
        .from('strategic_next_questions')
        .update({ status: 'answered' })
        .eq('id', question_id)
        .eq('user_id', user.id);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
