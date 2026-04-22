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
    const startOffset = firstWeekday;
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
      <div style={{ ...styles.formCardHeader, alignItems: 'center', borderBottom: 'none', paddingBottom: 0 }}>
        <h3 style={{ ...styles.cardTitle, textTransform: 'capitalize', margin: 0, textAlign: 'left' }}>{monthLabel}</h3>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => setCursor((current) => addMonths(current, -1))}
            style={{
              border: 'none',
              background: 'transparent',
              color: theme.textMuted,
              cursor: 'pointer',
              fontSize: '1.2rem',
              width: '30px',
              height: '30px',
              padding: 0,
            }}
            aria-label="Mês anterior"
            title="Mês anterior"
          >
            {'‹'}
          </button>
          <button
            type="button"
            onClick={() => setCursor((current) => addMonths(current, 1))}
            style={{
              border: 'none',
              background: 'transparent',
              color: theme.textMuted,
              cursor: 'pointer',
              fontSize: '1.2rem',
              width: '30px',
              height: '30px',
              padding: 0,
            }}
            aria-label="Próximo mês"
            title="Próximo mês"
          >
            {'›'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '10px', paddingTop: '6px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px' }}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayName, index) => (
            <div key={`${dayName}-${index}`} style={{ ...styles.smallText, textAlign: 'center', fontWeight: 700 }}>
              {dayName}
            </div>
          ))}

          <div
            style={{
              gridColumn: '1 / -1',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: '6px',
            }}
          >
            {days.map((cell, index) => {
              const isToday = Boolean(cell.date && sameDate(cell.date, today));
              const dateKey = cell.date ? toIsoDate(cell.date) : '';
              const hasNotes = dateKey ? notedDateKeys.has(dateKey) : false;

              if (!cell.date || !cell.day) {
                return (
                  <div
                    key={`${cell.day || 'empty'}-${index}`}
                    style={{
                      minHeight: '40px',
                      background: 'transparent',
                    }}
                  />
                );
              }

              return (
                <button
                  key={`${cell.day}-${index}`}
                  type="button"
                  onClick={() => onSelectDate?.(cell.date as Date)}
                  style={{
                    minHeight: '40px',
                    border: 'none',
                    borderRadius: '10px',
                    background: isToday ? '#1d4ed8' : 'transparent',
                    color: isToday ? '#ffffff' : theme.text,
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
                  {hasNotes ? null : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
