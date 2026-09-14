import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Banner, EmptyState, PageHeader, Spinner } from '../components/Ui';

export default function MyCoursesPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/courses/mine')
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="My learning" subtitle="Courses you are enrolled in." />
      <Banner>{error}</Banner>
      {loading && <Spinner />}
      {!loading && items.length === 0 && (
        <EmptyState
          title="Nothing here yet"
          text="Browse the catalog and enroll to start learning."
          action={<Link className="btn" to="/courses">Open catalog</Link>}
        />
      )}
      <div className="grid">
        {items.map((course) => (
          <article className="card" key={course._id}>
            <h3>{course.title}</h3>
            <p className="muted">{course.description}</p>
            <div className="row">
              <Link className="btn" to={`/courses/${course._id}/learn`}>Learn</Link>
              <Link className="btn secondary" to={`/courses/${course._id}`}>Assignments</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
