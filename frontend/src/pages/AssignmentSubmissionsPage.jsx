import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Banner, Badge, EmptyState, PageHeader, Spinner } from '../components/Ui';
import { useToast } from '../components/Toast';
import { formatDate, plainText } from '../utils/format';

export default function AssignmentSubmissionsPage() {
  const { assignmentId } = useParams();
  const toast = useToast();
  const [assignment, setAssignment] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      api(`/api/assignments/${assignmentId}`).then((res) => setAssignment(res.data)).catch(() => {}),
      api(`/api/assignments/${assignmentId}/submissions`).then((res) => setItems(res.data)),
    ])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [assignmentId]);

  const evaluate = async (id) => {
    const payload = form[id] || {};
    try {
      await api(`/api/submissions/${id}/evaluate`, {
        method: 'PUT',
        body: { marks: Number(payload.marks), feedback: payload.feedback || '' },
      });
      toast.push('Evaluation saved');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const courseLink = assignment?.course?._id ? `/courses/${assignment.course._id}` : '/courses';

  return (
    <div>
      <PageHeader
        title={assignment ? `${assignment.title} — Submissions` : 'Submission review'}
        subtitle={
          assignment
            ? `Course: ${assignment.course?.title || '—'} · Maximum ${assignment.maxMarks} marks · Due ${formatDate(assignment.dueDate)}`
            : 'Award marks within the assignment maximum and leave feedback.'
        }
        actions={
          <Link className="btn secondary" to={courseLink}>
            ← Back to course
          </Link>
        }
      />
      <Banner>{error}</Banner>
      {loading && <Spinner label="Loading submissions…" />}
      {!loading && items.length === 0 && (
        <EmptyState
          title="No submissions yet"
          text="Students enrolled in this course will appear here after they submit work."
          action={
            <Link className="btn secondary" to={courseLink}>
              ← Back to course
            </Link>
          }
        />
      )}
      {items.map((s) => (
        <article className="card" key={s._id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h3>{s.student?.name}</h3>
              <p className="muted">{s.student?.email} · {formatDate(s.submittedAt)}</p>
            </div>
            <Badge tone={s.status === 'EVALUATED' ? 'ok' : 'warn'}>{s.status}</Badge>
          </div>
          <p>{plainText(s.content)}</p>
          {s.marks != null && (
            <p className="muted">
              Current marks: <strong>{s.marks}</strong> / {assignment?.maxMarks || 100}
              {s.feedback && <span> · Feedback: &ldquo;{plainText(s.feedback)}&rdquo;</span>}
            </p>
          )}
          <div className="row">
            <input
              style={{ maxWidth: 140 }}
              type="number"
              min="0"
              max={assignment?.maxMarks || 100}
              placeholder={`Marks (0-${assignment?.maxMarks || 100})`}
              value={form[s._id]?.marks ?? ''}
              onChange={(e) => setForm({ ...form, [s._id]: { ...form[s._id], marks: e.target.value } })}
            />
            <input
              style={{ maxWidth: 360 }}
              placeholder="Feedback"
              value={form[s._id]?.feedback ?? s.feedback ?? ''}
              onChange={(e) => setForm({ ...form, [s._id]: { ...form[s._id], feedback: e.target.value } })}
            />
            <button className="btn" type="button" onClick={() => evaluate(s._id)}>
              Save evaluation
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
