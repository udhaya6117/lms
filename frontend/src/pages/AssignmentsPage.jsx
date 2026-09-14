import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Banner, Badge, EmptyState, PageHeader, Spinner } from '../components/Ui';
import { dueLabel, formatDate, isOverdue } from '../utils/format';

export default function AssignmentsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/assignments/mine')
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="Work from courses you are enrolled in. Late submissions are rejected."
      />
      <Banner>{error}</Banner>
      {loading && <Spinner label="Loading assignments…" />}
      {!loading && items.length === 0 && (
        <EmptyState
          title="No assignments yet"
          text="Enroll in a published course to see due work here."
          action={<Link className="btn" to="/courses">Browse courses</Link>}
        />
      )}
      {items.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Course</th>
                <th>Due</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="muted">
                      {item.section?.title ? `${item.section.title} · ` : ''}
                      Max {item.maxMarks} marks
                    </div>
                  </td>
                  <td>{item.course?.title || '—'}</td>
                  <td>
                    {formatDate(item.dueDate)} · {dueLabel(item.dueDate)}
                    {isOverdue(item.dueDate) && !item.mySubmission && (
                      <Badge tone="danger">Overdue</Badge>
                    )}
                  </td>
                  <td>
                    {item.mySubmission ? (
                      <Badge tone={item.mySubmission.status === 'EVALUATED' ? 'ok' : 'warn'}>
                        {item.mySubmission.status}
                      </Badge>
                    ) : (
                      <Badge>Not submitted</Badge>
                    )}
                  </td>
                  <td>
                    {item.course?._id && (
                      <>
                        <Link to={`/courses/${item.course._id}/learn`}>Study</Link>
                        {' · '}
                        <Link to={`/courses/${item.course._id}`}>Assignment</Link>
                      </>
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
