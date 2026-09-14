import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Banner, EmptyState, PageHeader } from '../components/Ui';
import { plainText } from '../utils/format';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = () =>
    api('/api/notifications')
      .then((res) => setItems(res.data || []))
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    try {
      await api(`/api/notifications/${id}/read`, { method: 'PUT' });
      await load();
      window.dispatchEvent(new Event('lms-inbox-refresh'));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Approvals, enrollments, and course updates." />
      <Banner>{error}</Banner>
      {items.length === 0 && <EmptyState title="Inbox is empty" text="You will see updates here as courses move through review and learning." />}
      {items.map((n) => (
        <article className="card" key={n._id} style={{ opacity: n.read ? 0.7 : 1 }}>
          <h3>{n.title}</h3>
          <p className="muted">{plainText(n.body)}</p>
          {!n.read && (
            <button className="btn secondary" type="button" onClick={() => markRead(n._id)}>
              Mark read
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
