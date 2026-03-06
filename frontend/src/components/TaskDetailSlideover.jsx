import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const statusPill = (s) => (s === 'DONE' ? 'pill pill-done' : s === 'IN_PROGRESS' ? 'pill pill-progress' : 'pill pill-todo');
const priorityPill = (p) => `pill pill-priority-${(p || 'medium').toLowerCase()}`;
const getAttachmentUrl = (url) => (url?.startsWith('http') ? url : (url ? `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}` : '#'));

export default function TaskDetailSlideover({ taskId, onClose, onRefresh }) {
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [commentBody, setCommentBody] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();
  const assignees = Array.isArray(task?.assignedTo) ? task.assignedTo : task?.assignedTo ? [task.assignedTo] : [];
  const assignedIds = assignees.map((a) => String(a?._id ?? a));
  const canEdit =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    (user?.role === 'USER' && assignedIds.includes(String(user?.id)));
  const canCreateTask = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchTask = () => {
    if (!taskId) return;
    api.get(`/tasks/${taskId}`).then((res) => setTask(res.data)).catch(() => onClose());
  };

  useEffect(() => {
    if (!taskId) return;
    fetchTask();
    api.get(`/tasks/${taskId}/comments`).then((res) => setComments(res.data)).catch(() => {});
    api.get(`/tasks/${taskId}/activity`).then((res) => setActivity(res.data || [])).catch(() => setActivity([]));
  }, [taskId]);

  const handleEdit = () => {
    onClose();
    navigate(`/tasks/${taskId}`);
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const { data } = await api.post(`/tasks/${taskId}/duplicate`);
      onRefresh?.();
      onClose();
      addToast('Task duplicated');
      navigate(`/tasks/${data._id}`);
    } catch {
      addToast('Failed to duplicate', 'error');
    } finally {
      setDuplicating(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setLoadingComment(true);
    try {
      const res = await api.post(`/tasks/${taskId}/comments`, { body: commentBody.trim() });
      setComments((prev) => [...prev, res.data]);
      setCommentBody('');
      addToast('Comment added');
    } catch {
      addToast('Failed to add comment', 'error');
    } finally {
      setLoadingComment(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/tasks/${taskId}/attachments`, formData);
      fetchTask();
      addToast('File attached');
    } catch {
      addToast('Upload failed', 'error');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  if (!taskId) return null;

  return (
    <>
      <div className="slideover-backdrop" onClick={onClose} aria-hidden />
      <div className="slideover-panel glass card-premium" role="dialog" aria-label="Task details">
        <div className="slideover-header">
          <h2 className="slideover-title">Task details</h2>
          <button type="button" className="slideover-close btn-ghost" onClick={onClose} aria-label="Close">×</button>
        </div>
        {!task ? (
          <div className="slideover-body">
            <div className="skeleton" style={{ height: 24, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 60 }} />
          </div>
        ) : (
          <div className="slideover-body">
            <h3 className="slideover-task-title">{task.title}</h3>
            <div className="slideover-meta">
              <span className={statusPill(task.status)}>{task.status}</span>
              <span className={priorityPill(task.priority)}>{task.priority}</span>
              {assignees.length > 0 && (
                <span className="slideover-assignee">
                  Assigned to {assignees.map((a) => a?.email || a).filter(Boolean).join(', ')}
                </span>
              )}
              {task.dueDate && (
                <span className="slideover-due">Due {new Date(task.dueDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              )}
            </div>
            {task.tags?.length > 0 && (
              <div className="slideover-tags">
                {task.tags.map((t) => (
                  <span key={t} className="pill pill-role">{t}</span>
                ))}
              </div>
            )}
            {task.description && (
              <div className="slideover-desc">
                <div className="slideover-label">Description</div>
                <p>{task.description}</p>
              </div>
            )}
            {task.subtasks?.length > 0 && (
              <div className="slideover-block">
                <div className="slideover-label">Subtasks</div>
                <ul className="slideover-subtasks">
                  {task.subtasks.map((s, i) => (
                    <li key={i} className={s.done ? 'done' : ''}>
                      <span className="slideover-check">{s.done ? '✓' : '○'}</span> {s.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {task.attachments?.length > 0 && (
              <div className="slideover-block">
                <div className="slideover-label">Attachments</div>
                <ul className="slideover-attachments">
                  {task.attachments.map((a, i) => (
                    <li key={i}>
                      <a href={getAttachmentUrl(a.url)} target="_blank" rel="noopener noreferrer">
                        {a.name || 'File'}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canEdit && (
              <div className="slideover-block">
                <label className="slideover-label">Add attachment (image or PDF)</label>
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploadingFile} className="slideover-file-input" />
                {uploadingFile && <span className="slideover-uploading">Uploading…</span>}
              </div>
            )}
            <div className="slideover-block">
              <div className="slideover-label">Comments ({comments.length})</div>
              <ul className="slideover-comments">
                {comments.map((c) => (
                  <li key={c._id}>
                    <strong>{c.userId?.email}</strong>
                    <span className="slideover-comment-date">{new Date(c.createdAt).toLocaleString()}</span>
                    <p>{c.body}</p>
                  </li>
                ))}
              </ul>
              <form onSubmit={handleAddComment} className="slideover-comment-form">
                <textarea
                  placeholder="Add a comment…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  className="input-glass"
                  rows={2}
                />
                <button type="submit" disabled={loadingComment || !commentBody.trim()} className="btn-primary btn-sm">
                  {loadingComment ? 'Sending…' : 'Comment'}
                </button>
              </form>
            </div>
            {activity.length > 0 && (
              <div className="slideover-block">
                <div className="slideover-label">Activity</div>
                <ul className="slideover-activity">
                  {activity.map((a) => (
                    <li key={a._id}>
                      <span className="slideover-activity-action">{a.action}</span>
                      {a.userId?.email && <span> by {a.userId.email}</span>}
                      <span className="slideover-activity-date">{new Date(a.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="slideover-actions">
              {canEdit && (
                <button type="button" className="btn-primary" onClick={handleEdit}>
                  Edit task
                </button>
              )}
              {canCreateTask && (
                <button type="button" className="btn-ghost" onClick={handleDuplicate} disabled={duplicating}>
                  {duplicating ? 'Duplicating…' : 'Duplicate task'}
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
