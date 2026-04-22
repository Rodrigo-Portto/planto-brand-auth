import { useMemo, useState } from 'react';
import type { DashboardStyles, DashboardThemeColors } from '../../types/dashboard';

interface MonthlyCalendarPanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  notedDates?: string[];
  onSelectDate?: (date: Date) => void;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function MonthlyCalendarPanel({ styles, theme, notedDates = [], onSelectDate }: MonthlyCalendarPanelProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const today = new Date();

  const notedDateKeys = useMemo(() => new Set(notedDates), [notedDates]);

  const monthLabel = useMemo(
    () => cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    [cursor]
  );

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const firstWeekday = first.getDay();
    const startOffset = (firstWeekday + 6) % 7;
    const monthDays = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells: Array<{ day: number | null; date: Date | null }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ day: null, date: null });
    }

    for (let day = 1; day <= monthDays; day += 1) {
      const date = new Date(first.getFullYear(), first.getMonth(), day);
      cells.push({ day, date });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: null, date: null });
    }

    return cells;
  }, [cursor]);

  return (
    <section style={styles.cardBlock}>
      <div style={styles.formCardHeader}>
        <button type="button" style={styles.cardIconButton} onClick={() => setCursor((current) => addMonths(current, -1))}>
          {'<'}
        </button>
        <h3 style={{ ...styles.cardTitle, textTransform: 'capitalize' }}>{monthLabel}</h3>
        <button type="button" style={styles.cardIconButton} onClick={() => setCursor((current) => addMonths(current, 1))}>
          {'>'}
        </button>
      </div>

      <div style={styles.formCardBody}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px' }}>
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dayName) => (
            <div key={dayName} style={{ ...styles.smallText, textAlign: 'center', fontWeight: 700 }}>
              {dayName}
            </div>
          ))}

          {days.map((cell, index) => {
            if (!cell.date || !cell.day) {
              return <div key={`${cell.day || 'empty'}-${index}`} style={{ minHeight: '34px' }} />;
            }

            const isToday = sameDate(cell.date, today);
            const dateKey = toIsoDate(cell.date);
            const hasNotes = notedDateKeys.has(dateKey);

            return (
              <button
                key={`${cell.day}-${index}`}
                type="button"
                onClick={() => onSelectDate?.(cell.date as Date)}
                style={{
                  minHeight: '34px',
                  borderRadius: '6px',
                  border: `1px solid ${isToday ? theme.borderAccent : theme.border}`,
                  background: isToday ? theme.accentSoft : theme.shellMuted,
                  color: theme.text,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '0.82rem',
                  fontWeight: isToday ? 700 : 500,
                  position: 'relative',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label={`Adicionar nota para ${cell.date.toLocaleDateString('pt-BR')}`}
                title="Adicionar nota"
              >
                {cell.day}
                {hasNotes ? (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      width: '5px',
                      height: '5px',
                      borderRadius: '999px',
                      background: theme.accent,
                    }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
