import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Banner, PasswordField } from '../components/Ui';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-hero">
        <h1>Join as a student.</h1>
        <p>Public registration creates a student account. Trainers and admins are provisioned by an administrator.</p>
      </section>
      <section className="auth-side">
        <div className="card auth-card">
          <h1>Create account</h1>
          <Banner>{error}</Banner>
          <form onSubmit={submit}>
            <div className="field">
              <label>Full name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="field">
              <label>Password</label>
              <PasswordField value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" />
            </div>
            <button className="btn" disabled={busy} type="submit">
              {busy ? 'Creating…' : 'Register'}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 16 }}>
            Already enrolled? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
