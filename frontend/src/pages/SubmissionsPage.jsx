import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Banner, Badge, EmptyState, PageHeader, Spinner } from '../components/Ui';
import { plainText } from '../utils/format';

export default function SubmissionsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/submissions/me')
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="My submissions" subtitle="Work you have turned in, with marks after evaluation." />
      <Banner>{error}</Banner>
      {loading && <Spinner />}
      {!loading && items.length === 0 && (
        <EmptyState title="No submissions" text="Submit an assignment from an enrolled course to see it here." />
      )}
      {items.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Course</th>
                <th>Status</th>
                <th>Marks</th>
                <th>Trainer feedback</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s._id}>
                  <td>
                    <strong>{s.assignment?.title || 'Assignment'}</strong>
                  </td>
                  <td>
                    {s.assignment?.course?._id ? (
                      <Link to={`/courses/${s.assignment.course._id}`}>{s.assignment.course.title}</Link>
                    ) : '—'}
                  </td>
                  <td>
                    <Badge tone={s.status === 'EVALUATED' ? 'ok' : 'warn'}>{s.status}</Badge>
                  </td>
                  <td>
                    {s.marks != null ? (
                      <strong>
                        {s.marks} / {s.assignment?.maxMarks || 100}
                      </strong>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {s.feedback ? (
                      <span>&ldquo;{plainText(s.feedback)}&rdquo;</span>
                    ) : (
                      <span className="muted">
                        {s.status === 'EVALUATED' ? 'No remarks' : 'Pending evaluation'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
