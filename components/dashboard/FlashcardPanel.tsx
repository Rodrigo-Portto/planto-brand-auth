import { useEffect, useMemo, useState } from 'react';
import type { DashboardStyles, DashboardThemeColors, StrategicQuestion } from '../../types/dashboard';

interface FlashcardPanelProps {
  styles: DashboardStyles;
  colors: DashboardThemeColors;
  questions: StrategicQuestion[];
  onAnswered?: () => void;
  embedded?: boolean;
}

const DIMENSION_META: Record<string, { icon: string; label: string; opacity: number }> = {
  prova: { icon: 'P', label: 'Prova', opacity: 1 },
  autoridade: { icon: 'A', label: 'Autoridade', opacity: 0.92 },
  pessoas: { icon: 'U', label: 'Público', opacity: 0.84 },
  diferenciacao: { icon: 'D', label: 'Diferenciação', opacity: 0.76 },
  editorial: { icon: 'E', label: 'Editorial', opacity: 0.88 },
  negocio: { icon: 'N', label: 'Negócio', opacity: 0.8 },
  identidade: { icon: 'I', label: 'Identidade', opacity: 0.96 },
  comunicacao: { icon: 'C', label: 'Comunicação', opacity: 0.72 },
};

const DEFAULT_META = { icon: 'S', label: 'Estratégico', opacity: 0.9 };

function alpha(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((part) => part + part)
        .join('')
    : normalized;

  if (value.length !== 6) return hex;

  const alphaHex = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${value}${alphaHex}`;
}

export function FlashcardPanel({ styles, colors, questions, onAnswered, embedded = false }: FlashcardPanelProps) {
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const pending = useMemo(
    () => questions.filter((question) => !answered.has(question.id)),
    [questions, answered]
  );
  const current = pending[idx % Math.max(pending.length, 1)];
  const meta = current?.dimension_key ? (DIMENSION_META[current.dimension_key] ?? DEFAULT_META) : DEFAULT_META;
  const accentColor = alpha(colors.accent, meta.opacity);

  useEffect(() => {
    setAnswered((previous) => {
      const next = new Set<string>();

      questions.forEach((question) => {
        if (previous.has(question.id)) {
          next.add(question.id);
        }
      });

      return next;
    });
  }, [questions]);

  useEffect(() => {
    if (pending.length === 0) {
      setIdx(0);
      return;
    }

    if (idx >= pending.length) {
      setIdx(0);
    }
  }, [idx, pending.length]);

  const handleSubmit = async () => {
    if (!text.trim() || !current) return;

    setSubmitting(true);

    try {
      const response = await fetch('/api/flashcard', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: current.id, answer_text: text.trim() }),
      });

      if (!response.ok) {
        throw new Error('Falha ao responder pergunta.');
      }

      setAnswered((previous) => new Set([...previous, current.id]));
      setText('');
      setDone(true);

      window.setTimeout(() => {
        setDone(false);
        setIdx((currentIdx) => (currentIdx + 1) % Math.max(pending.length - 1, 1));
        onAnswered?.();
      }, 1200);
    } catch {
      // noop
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setText('');
    setIdx((currentIdx) => (currentIdx + 1) % Math.max(pending.length, 1));
  };

  const containerStyle = embedded
    ? { display: 'grid', gap: '14px' }
    : { ...styles.panelCard, border: `1px solid ${colors.borderAccent}` };

  if (pending.length === 0) {
    return (
      <section style={embedded ? { display: 'grid', gap: '14px' } : styles.panelCard}>
        <div style={styles.panelCardHeader}>
          <h2 style={styles.panelTitle}>Perguntas Estratégicas</h2>
          <span
            style={{
              ...styles.countBadge,
              padding: '3px 8px',
              background: colors.statusActiveSoft,
              color: colors.statusActiveText,
            }}
          >
            OK TUDO RESPONDIDO
          </span>
        </div>
        <p style={{ ...styles.bodyText, fontSize: '0.88rem', color: colors.textMuted }}>
          Novas perguntas aparecem conforme o sistema identifica lacunas no contexto da marca.
        </p>
      </section>
    );
  }

  return (
    <section style={containerStyle}>
      <div style={styles.panelCardHeader}>
        <h2 style={styles.panelTitle}>Perguntas Estratégicas</h2>
        <span
          style={{
            ...styles.countBadge,
            padding: '3px 8px',
            background: colors.statusMutedSoft,
            color: colors.statusMutedText,
          }}
        >
          {pending.length} pendente{pending.length > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
        {questions.map((question) => (
          <div
            key={question.id}
            style={{
              flex: 1,
              height: '3px',
              borderRadius: 'var(--planto-radius-xs)',
              background: answered.has(question.id)
                ? colors.statusActive
                : question.id === current?.id
                ? accentColor
                : colors.progressTrack,
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--planto-radius-control)',
            background: alpha(colors.accent, 0.12),
            border: `1px solid ${colors.borderAccent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            color: accentColor,
            flexShrink: 0,
          }}
        >
          {meta.icon}
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {meta.label}
          </div>
          {current?.question_goal ? <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: '1px' }}>{current.question_goal}</div> : null}
        </div>
        {current?.severity === 'high' ? (
          <div
            style={{
              marginLeft: 'auto',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 'var(--planto-radius-surface)',
              background: colors.statusDangerSoft,
              color: colors.statusDangerText,
            }}
          >
            Alta prioridade
          </div>
        ) : null}
      </div>

      {done ? (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            background: colors.statusActiveSoft,
            borderRadius: 'var(--planto-radius-surface)',
            marginBottom: '10px',
            border: `1px solid ${colors.borderAccent}`,
          }}
        >
          <div style={{ fontSize: '1.4rem', marginBottom: '6px', color: colors.textStrong }}>OK</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: colors.statusActiveText }}>Enviado ao pipeline</div>
        </div>
      ) : (
        <>
          <p style={{ ...styles.bodyText, fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px' }}>
            {current?.question_text}
          </p>

          {current?.expected_unlock ? (
            <div
              style={{
                background: colors.statusMutedSoft,
                border: `1px dashed ${colors.borderAccent}`,
                borderRadius: 'var(--planto-radius-control)',
                padding: '7px 10px',
                marginBottom: '10px',
                fontSize: '0.75rem',
                color: colors.textMuted,
              }}
            >
              Unlock: {current.expected_unlock}
            </div>
          ) : null}

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Escreva o que vier a mente. Pode ser curto."
            rows={3}
            style={{
              ...(styles.textarea || {}),
              width: '100%',
              border: `1px solid ${text ? colors.borderAccent : colors.border}`,
              marginBottom: '10px',
              resize: 'none',
              minHeight: 'unset',
            }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSkip} style={{ ...styles.secondaryButton, padding: '9px 14px', borderRadius: 'var(--planto-radius-control)' }}>
              Pular
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={!text.trim() || submitting}
              style={{
                ...styles.primaryButton,
                flex: 1,
                padding: '9px 14px',
                borderRadius: 'var(--planto-radius-control)',
                background: text.trim() ? colors.accent : colors.statusMutedSoft,
                color: text.trim() ? colors.accentText : colors.textMuted,
                cursor: text.trim() ? 'pointer' : 'default',
                opacity: submitting ? 0.7 : text.trim() ? 1 : 0.82,
              }}
            >
              {submitting ? 'Enviando...' : 'Enviar ao pipeline ->'}
            </button>
          </div>
        </>
      )}

      {pending.length > 1 && !done ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '12px' }}>
          {pending.map((question, index) => (
            <div
              key={question.id}
              onClick={() => {
                setText('');
                setIdx(index);
              }}
              style={{
                width: index === idx % pending.length ? '16px' : '5px',
                height: '5px',
                borderRadius: 'var(--planto-radius-xs)',
                background: index === idx % pending.length ? accentColor : colors.progressTrack,
                cursor: 'pointer',
                transition: 'all 0.25s',
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
