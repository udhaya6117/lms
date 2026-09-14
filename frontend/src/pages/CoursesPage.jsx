import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Banner, Badge, EmptyState, PageHeader, Spinner } from '../components/Ui';
import { useToast } from '../components/Toast';

export default function CoursesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: nextPage, limit: 9, search, ...(level ? { level } : {}), ...(category ? { category } : {}) });
      const { data, pagination: p } = await api(`/api/courses?${qs}`);
      setItems(data);
      setPagination(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api('/api/categories').then((res) => setCategories(res.data)).catch(() => {});
    load();
  }, [page]);

  const enroll = async (id) => {
    try {
      await api(`/api/courses/${id}/enroll`, { method: 'POST' });
      toast.push('Enrolled successfully');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const title =
    user.role === 'student' ? 'Available courses' : user.role === 'trainer' ? 'Courses you own' : 'All courses';

  return (
    <div>
      <PageHeader
        title={title}
        subtitle="Search published programs, enroll, and open a course workspace."
      />
      <Banner>{error}</Banner>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load(1);
        }}
      >
        <input
          placeholder="Search by title or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">All levels</option>
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <button className="btn secondary" type="submit">Search</button>
      </form>
      {loading ? (
        <Spinner label="Loading courses…" />
      ) : items.length === 0 ? (
        <EmptyState title="No courses found" text="Try another search, or create a course if you are a trainer." />
      ) : (
        <div className="grid">
          {items.map((course) => (
            <article className="card" key={course._id}>
              <h3>{course.title}</h3>
              <p className="muted">{course.description}</p>
              <div className="course-meta">
                <Badge>{course.trainer?.name || 'Trainer'}</Badge>
                <Badge>{course.enrollmentCount || 0} enrolled</Badge>
                <Badge>{course.level || 'Beginner'}</Badge>
                <Badge>{course.price ? `₹${course.price}` : 'Free'}</Badge>
                {course.status && course.status !== 'PUBLISHED' && <Badge tone="warn">{course.status}</Badge>}
                {course.enrolled && <Badge tone="ok">Enrolled</Badge>}
              </div>
              <div className="row">
                <Link className="btn secondary" to={`/courses/${course._id}`}>Open</Link>
                {user.role === 'student' && !course.enrolled && Number(course.price) > 0 && (
                  <Link className="btn" to={`/courses/${course._id}/checkout`}>Buy</Link>
                )}
                {user.role === 'student' && !course.enrolled && !Number(course.price) && (
                  <button className="btn" type="button" onClick={() => enroll(course._id)}>
                    Enroll
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">
          Previous
        </button>
        <span className="muted">
          Page {page} of {pagination.pages} · {pagination.total} courses
        </span>
        <button className="btn secondary" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} type="button">
          Next
        </button>
      </div>
    </div>
  );
}
