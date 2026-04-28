import { useState, useEffect, useCallback } from 'react';
import type { DashboardStyles, DashboardThemeColors } from '../../types/dashboard';

interface FlashcardQuestion {
  id: string;
  question_text: string;
  question_goal: string;
  dimension_key: string;
  priority: number;
  expected_unlock: string | null;
  severity: 'high' | 'medium' | 'low';
}

interface FlashcardPanelProps {
  styles: DashboardStyles;
  colors: DashboardThemeColors;
  onAnswered?: () => void;
}

const DIMENSION_META: Record<string, { color: string; icon: string; label: string }> = {
  prova:         { color: '#ef4444', icon: '◎', label: 'Prova' },
  autoridade:    { color: '#f97316', icon: '◉', label: 'Autoridade' },
  pessoas:       { color: '#ec4899', icon: '◈', label: 'Público' },
  diferenciacao: { color: '#8b5cf6', icon: '◬', label: 'Diferenciação' },
  editorial:     { color: '#06b6d4', icon: '∿', label: 'Editorial' },
  negocio:       { color: '#f59e0b', icon: '⬡', label: 'Negócio' },
  identidade:    { color: '#22c55e', icon: '✦', label: 'Identidade' },
  comunicacao:   { color: '#3b82f6', icon: '◎', label: 'Comunicação' },
};
const DEFAULT_META = { color: '#22c55e', icon: '⬡', label: 'Estratégico' };

export function FlashcardPanel({ styles, colors, onAnswered }: FlashcardPanelProps) {
  const [questions, setQuestions] = useState<FlashcardQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadQuestions = useCallback(async () => {
    try {
      const res = await fetch('/api/flashcard', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json() as { questions: FlashcardQuestion[] };
      setQuestions(data.questions || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadQuestions(); }, [loadQuestions]);

  const pending = questions.filter((q) => !answered.has(q.id));
  const current = pending[idx % Math.max(pending.length, 1)];
  const meta = current ? (DIMENSION_META[current.dimension_key] ?? DEFAULT_META) : DEFAULT_META;

  const handleSubmit = async () => {
    if (!text.trim() || !current) return;
    setSubmitting(true);
    try {
      await fetch('/api/flashcard', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: current.id, answer_text: text.trim() }),
      });
      setAnswered((prev) => new Set([...prev, current.id]));
      setText('');
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setIdx((i) => (i + 1) % Math.max(pending.length - 1, 1));
        onAnswered?.();
      }, 1200);
    } catch { /* silent */ } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setText('');
    setIdx((i) => (i + 1) % Math.max(pending.length, 1));
  };

  if (loading) {
    return (
      <section style={styles.panelCard}>
        <div style={styles.panelCardHeader}>
          <h2 style={styles.panelTitle}>Perguntas Estratégicas</h2>
        </div>
        <p style={{ ...styles.bodyText, fontSize: '0.88rem', opacity: 0.5 }}>Carregando…</p>
      </section>
    );
  }

  if (pending.length === 0) {
    return (
      <section style={styles.panelCard}>
        <div style={styles.panelCardHeader}>
          <h2 style={styles.panelTitle}>Perguntas Estratégicas</h2>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
            ✓ TUDO RESPONDIDO
          </span>
        </div>
        <p style={{ ...styles.bodyText, fontSize: '0.88rem', opacity: 0.6, lineHeight: 1.6 }}>
          Novas perguntas aparecem conforme o sistema identifica lacunas no contexto da marca.
        </p>
      </section>
    );
  }

  return (
    <section style={{ ...styles.panelCard, border: `1px solid ${meta.color}25` }}>
      <div style={styles.panelCardHeader}>
        <h2 style={styles.panelTitle}>Perguntas Estratégicas</h2>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: `${meta.color}15`, color: meta.color }}>
          {pending.length} pendente{pending.length > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
        {questions.map((q) => (
          <div key={q.id} style={{ flex: 1, height: '3px', borderRadius: '3px', background: answered.has(q.id) ? '#22c55e' : q.id === current?.id ? meta.color : 'rgba(255,255,255,0.08)', transition: 'background 0.3s ease' }} />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${meta.color}15`, border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: meta.color, flexShrink: 0 }}>
          {meta.icon}
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{meta.label}</div>
          {current?.question_goal && <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: '1px' }}>{current.question_goal}</div>}
        </div>
        {current?.severity === 'high' && (
          <div style={{ marginLeft: 'auto', fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Alta prioridade</div>
        )}
      </div>

      {done ? (
        <div style={{ padding: '20px', textAlign: 'center' as const, background: 'rgba(34,197,94,0.06)', borderRadius: '12px', marginBottom: '10px' }}>
          <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>✦</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#22c55e' }}>Enviado ao pipeline</div>
        </div>
      ) : (
        <>
          <p style={{ ...styles.bodyText, fontSize: '0.95rem', lineHeight: 1.65, fontWeight: 600, marginBottom: '10px' }}>
            {current?.question_text}
          </p>

          {current?.expected_unlock && (
            <div style={{ background: `${meta.color}08`, border: `1px dashed ${meta.color}20`, borderRadius: '8px', padding: '7px 10px', marginBottom: '10px', fontSize: '0.75rem', color: colors.textMuted }}>
              🔓 {current.expected_unlock}
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva o que vier à mente. Pode ser curto."
            rows={3}
            style={{ width: '100%', background: 'rgba(0,0,0,0.25)', border: `1px solid ${text ? `${meta.color}50` : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', padding: '9px 12px', fontSize: '0.9rem', color: colors.text, resize: 'none' as const, fontFamily: 'inherit', outline: 'none', lineHeight: 1.5, marginBottom: '10px', transition: 'border-color 0.2s', boxSizing: 'border-box' as const }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSkip} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', fontSize: '0.85rem', color: colors.textMuted, cursor: 'pointer', fontFamily: 'inherit' }}>
              Pular
            </button>
            <button onClick={() => void handleSubmit()} disabled={!text.trim() || submitting}
              style={{ flex: 1, padding: '9px 14px', background: text.trim() ? meta.color : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '9px', fontSize: '0.85rem', fontWeight: 700, color: text.trim() ? '#fff' : 'rgba(255,255,255,0.2)', cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.2s', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Enviando…' : 'Enviar ao pipeline →'}
            </button>
          </div>
        </>
      )}

      {pending.length > 1 && !done && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '12px' }}>
          {pending.map((q, i) => (
            <div key={q.id} onClick={() => { setText(''); setIdx(i); }}
              style={{ width: i === idx % pending.length ? '16px' : '5px', height: '5px', borderRadius: '4px', background: i === idx % pending.length ? meta.color : 'rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'all 0.25s' }} />
          ))}
        </div>
      )}
    </section>
  );
}
