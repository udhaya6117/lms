import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Banner, EmptyState, PageHeader, Spinner } from '../components/Ui';
import { useToast } from '../components/Toast';

const emptyForm = {
  title: '',
  description: '',
  category: '',
  level: 'Beginner',
  price: 0,
  sectionTitle: 'Section 1',
  documentTitle: '',
  documentContent: '',
};

export default function TrainerDashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api('/api/courses')
      .then((res) => setCourses(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    api('/api/categories').then((res) => setCategories(res.data)).catch(() => {});
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await api('/api/courses', {
        method: 'POST',
        body: { ...form, price: Number(form.price) || 0, category: form.category || null },
      });
      setForm(emptyForm);
      toast.push('Course created with Section 1');
      if (created.data?._id) {
        navigate(`/courses/${created.data._id}`);
        return;
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Teaching workspace"
        subtitle="Add Section 1 study material now. After admin approval you can add later sections without another review."
      />
      <Banner>{error}</Banner>
      <div className="page-split">
        <div className="card">
          <h3>New course</h3>
          <form onSubmit={create}>
            <div className="field">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Level</label>
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <div className="field">
              <label>Price (₹, 0 = free)</label>
              <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="field">
              <label>Section 1 title</label>
              <input
                value={form.sectionTitle}
                onChange={(e) => setForm({ ...form, sectionTitle: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Section 1 study document title</label>
              <input
                value={form.documentTitle}
                onChange={(e) => setForm({ ...form, documentTitle: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Section 1 study document</label>
              <textarea
                value={form.documentContent}
                onChange={(e) => setForm({ ...form, documentContent: e.target.value })}
                required
                minLength={10}
                placeholder="Write the first study document students will read."
              />
            </div>
            <button className="btn" disabled={busy} type="submit">
              {busy ? 'Creating…' : 'Create course'}
            </button>
          </form>
        </div>
        {loading ? (
          <Spinner label="Loading your courses…" />
        ) : courses.length === 0 ? (
          <EmptyState title="No courses yet" text="Create your first course to start adding assignments." />
        ) : (
          <div className="grid">
            {courses.map((c) => (
              <article className="card" key={c._id}>
                <h3>{c.title}</h3>
                <p className="muted">{c.description}</p>
                <p className="muted">{c.enrollmentCount || 0} learners · {c.status || 'DRAFT'} · {c.price ? `₹${c.price}` : 'Free'}</p>
                <Link className="btn" to={`/courses/${c._id}`}>Manage</Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
