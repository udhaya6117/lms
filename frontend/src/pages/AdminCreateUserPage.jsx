import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Banner, PageHeader, PasswordField, Spinner } from '../components/Ui';

export default function AdminCreateUserPage({ role }) {
  const { id } = useParams();
  const location = useLocation();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const isTrainer = role === 'trainer';
  const label = isTrainer ? 'trainer' : 'student';
  const listPath = isTrainer ? '/admin/trainers' : '/admin/students';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!editing) return undefined;
    const cached = location.state?.user;
    if (cached) {
      setForm({ name: cached.name || '', email: cached.email || '', password: '' });
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    api(`/api/users/${id}`)
      .then((res) => {
        setForm({ name: res.data.name || '', email: res.data.email || '', password: '' });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    return undefined;
  }, [editing, id, location.state]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) {
        const body = { name: form.name, email: form.email };
        if (form.password) body.password = form.password;
        await api(`/api/users/${id}`, { method: 'PUT', body });
      } else {
        await api('/api/users', { method: 'POST', body: { ...form, role } });
      }
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label={`Loading ${label}…`} />;

  return (
    <div>
      <PageHeader
        title={editing ? (isTrainer ? 'Edit trainer' : 'Edit student') : isTrainer ? 'Create trainer' : 'Create student'}
        subtitle={
          editing
            ? `Update the ${label} name, email, or password.`
            : isTrainer
              ? 'Faculty only. Create trainers and manage who can own courses.'
              : 'Learners only. Create students and manage who can enroll and submit work.'
        }
        actions={
          <Link className="btn secondary" to={listPath}>
            ← Back to {isTrainer ? 'trainers' : 'students'}
          </Link>
        }
      />
      <Banner>{error}</Banner>
      <div className="card create-user-card">
        <form onSubmit={save}>
          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="field">
            <label>{editing ? 'New password (optional)' : 'Password'}</label>
            <PasswordField
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editing}
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button className="btn" disabled={busy} type="submit">
            {busy ? 'Saving…' : editing ? `Save ${label}` : `Create ${label}`}
          </button>
        </form>
      </div>

      {done && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="create-ok-title">
          <div className="modal-card">
            <span className="modal-ok">✓</span>
            <h3 id="create-ok-title">
              {editing
                ? isTrainer
                  ? 'Trainer updated successfully'
                  : 'Student updated successfully'
                : isTrainer
                  ? 'Trainer created successfully'
                  : 'Student created successfully'}
            </h3>
            <p className="muted">
              {form.name} ({form.email}) is now in the {isTrainer ? 'trainers' : 'students'} list.
            </p>
            <button className="btn" type="button" onClick={() => navigate(listPath)}>
              Back to {isTrainer ? 'trainers' : 'students'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
