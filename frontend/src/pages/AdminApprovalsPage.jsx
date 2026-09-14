import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Banner, EmptyState, PageHeader } from '../components/Ui';
import { useToast } from '../components/Toast';

export default function AdminApprovalsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = () =>
    api('/api/courses/pending')
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const decide = async (id, approve) => {
    try {
      await api(`/api/courses/${id}/${approve ? 'approve' : 'reject'}`, {
        method: 'POST',
        body: approve ? {} : { comment: 'Please add more lessons before publishing.' },
      });
      toast.push(approve ? 'Course published' : 'Course sent back');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PageHeader title="Course approvals" subtitle="Trainers submit drafts. You preview, approve, or reject." />
      <Banner>{error}</Banner>
      {items.length === 0 && <EmptyState title="Queue is clear" text="No courses waiting for review." />}
      {items.map((c) => (
        <article className="card" key={c._id}>
          <h3>{c.title}</h3>
          <p className="muted">{c.description}</p>
          <p className="muted">Trainer: {c.trainer?.name}</p>
          <div className="row">
            <Link className="btn secondary" to={`/courses/${c._id}`}>Preview</Link>
            <button className="btn" type="button" onClick={() => decide(c._id, true)}>Approve</button>
            <button className="btn danger" type="button" onClick={() => decide(c._id, false)}>Reject</button>
          </div>
        </article>
      ))}
    </div>
  );
}
