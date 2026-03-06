import { Link } from 'react-router-dom';

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const statusLabels = { TODO: 'To do', IN_PROGRESS: 'In progress', DONE: 'Done' };

function statusPill(status) {
  if (status === 'TODO') return 'pill pill-todo';
  if (status === 'IN_PROGRESS') return 'pill pill-progress';
  return 'pill pill-done';
}

function priorityPill(priority) {
  const c = { LOW: 'pill-priority-low', MEDIUM: 'pill-priority-medium', HIGH: 'pill-priority-high', URGENT: 'pill-priority-urgent' };
  return `pill ${c[priority] || c.MEDIUM}`;
}

function formatDue(dueDate) {
  if (!dueDate) return '';
  const d = new Date(dueDate);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function KanbanView({ tasks, onCardClick, onStatusChange }) {
  const byStatus = STATUSES.reduce((acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s) }), {});

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: task._id, status: task.status }));
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('kanban-card-dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('kanban-card-dragging');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.id && data.status !== newStatus && onStatusChange) {
        onStatusChange(data.id, newStatus);
      }
    } catch {}
  };

  return (
    <div className="kanban-board">
      {STATUSES.map((status) => (
        <div
          key={status}
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, status)}
        >
          <div className="kanban-column-header">
            <span className="kanban-column-title">{statusLabels[status]}</span>
            <span className="kanban-column-count">{byStatus[status].length}</span>
          </div>
          <div className="kanban-column-cards">
            {byStatus[status].map((t) => (
              <div
                key={t._id}
                className="kanban-card glass card-hover"
                draggable={!!onStatusChange}
                onDragStart={(e) => onStatusChange && handleDragStart(e, t)}
                onDragEnd={handleDragEnd}
                onClick={() => onCardClick?.(t._id)}
              >
                <span className="kanban-card-title">{t.title}</span>
                <div className="kanban-card-meta">
                  <span className={priorityPill(t.priority)}>{t.priority}</span>
                  {t.dueDate && <span className="kanban-card-due">{formatDue(t.dueDate)}</span>}
                </div>
                {(() => {
                  const arr = Array.isArray(t.assignedTo) ? t.assignedTo : t.assignedTo ? [t.assignedTo] : [];
                  const emails = arr.map((a) => a?.email).filter(Boolean);
                  return emails.length > 0 ? (
                    <span className="kanban-card-assignees">{emails.slice(0, 2).join(', ')}{emails.length > 2 ? '…' : ''}</span>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
