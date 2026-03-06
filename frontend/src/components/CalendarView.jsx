import { useMemo } from 'react';
import { Link } from 'react-router-dom';

function formatDate(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CalendarView({ tasks, onCardClick }) {
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const d = new Date(t.dueDate);
      const key = d.toISOString().slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    Object.keys(map).forEach((k) => map[k].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
    return map;
  }, [tasks]);

  const sortedDates = useMemo(() => Object.keys(tasksByDate).sort(), [tasksByDate]);

  const noDueTasks = tasks.filter((t) => !t.dueDate);

  return (
    <div className="calendar-view">
      {noDueTasks.length > 0 && (
        <div className="calendar-section">
          <h3 className="calendar-section-title">No due date</h3>
          <div className="calendar-day-cards">
            {noDueTasks.map((t) => (
              <button
                key={t._id}
                type="button"
                className="calendar-card glass card-hover"
                onClick={() => onCardClick?.(t._id)}
              >
                <span className="calendar-card-title">{t.title}</span>
                <span className={`pill pill-${t.status === 'DONE' ? 'done' : t.status === 'IN_PROGRESS' ? 'progress' : 'todo'}`}>{t.status}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {sortedDates.map((dateKey) => (
        <div key={dateKey} className="calendar-section">
          <h3 className="calendar-section-title">{formatDate(new Date(dateKey))}</h3>
          <div className="calendar-day-cards">
            {tasksByDate[dateKey].map((t) => (
              <button
                key={t._id}
                type="button"
                className="calendar-card glass card-hover"
                onClick={() => onCardClick?.(t._id)}
              >
                <span className="calendar-card-title">{t.title}</span>
                <span className={`pill pill-${t.status === 'DONE' ? 'done' : t.status === 'IN_PROGRESS' ? 'progress' : 'todo'}`}>{t.status}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {sortedDates.length === 0 && noDueTasks.length === 0 && (
        <div className="calendar-empty">
          <span className="calendar-empty-icon">📅</span>
          <p>No tasks with due dates</p>
        </div>
      )}
    </div>
  );
}
