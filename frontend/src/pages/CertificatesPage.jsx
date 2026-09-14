import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Banner, EmptyState, PageHeader } from '../components/Ui';
import { formatDate } from '../utils/format';

export default function CertificatesPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/certificates/me')
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <PageHeader title="Certificates" subtitle="Issued when all lessons are complete and required quizzes are passed." />
      <Banner>{error}</Banner>
      {items.length === 0 && (
        <EmptyState title="No certificates yet" text="Finish a course learning path and pass the quiz to earn one." />
      )}
      <div className="grid">
        {items.map((c) => (
          <article className="card cert" key={c._id}>
            <p className="muted">Certificate of completion</p>
            <h2>{c.studentName}</h2>
            <p>has completed</p>
            <h3>{c.courseTitle}</h3>
            <p className="muted">ID {c.certificateId} · {formatDate(c.issuedAt)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
