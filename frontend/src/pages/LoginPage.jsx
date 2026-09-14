import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Banner, PasswordField } from '../components/Ui';

const DEMOS = [
  { role: 'Student', email: 'student@lms.com', password: 'Student@123' },
  { role: 'Trainer', email: 'trainer@lms.com', password: 'Trainer@123' },
  { role: 'Admin', email: 'admin@lms.com', password: 'Admin@123' },
];

const FLOW = [
  {
    role: 'Student',
    account: 'student@lms.com',
    steps: 'Open Wrench Wise — Assignment Walkthrough. See a graded paper, a waiting paper, submit one yourself, and a late assignment that is blocked.',
  },
  {
    role: 'Trainer',
    account: 'trainer@lms.com',
    steps: 'Open the same course → Review submissions. Grade “Waiting for marks” with marks and feedback.',
  },
  {
    role: 'Admin',
    account: 'admin@lms.com',
    steps: 'Approvals has Full-Stack Capstone. Trainers and Students directories are already populated.',
  },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('student@lms.com');
  const [password, setPassword] = useState('Student@123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
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
        <div className="auth-brand">
          <span className="brand-mark">A</span>
          <div>
            ACADEMIA <span>LMS</span>
            <small>Course & assignment workspace</small>
          </div>
        </div>
        <div className="auth-hero-copy">
          <p className="auth-kicker">WRENCH WISE ASSIGNMENT</p>
          <h1>A structured LMS for courses, enrollment, and evaluation.</h1>
          <p>
            Role-based access for admins, trainers, and students. Assignments, submissions, marks, and
            feedback — with authorization enforced on the API.
          </p>
        </div>
        <ol className="flow-guide">
          {FLOW.map((item) => (
            <li key={item.role}>
              <em>{item.role[0]}</em>
              <div>
                <strong>{item.role}</strong>
                <span>{item.account}</span>
                <p>{item.steps}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="flow-note">
          Isolation accounts: trainer2@lms.com and student2@lms.com (same passwords as trainer / student).
        </p>
      </section>
      <section className="auth-side">
        <div className="card auth-card">
          <p className="auth-card-kicker">Welcome back</p>
          <h1>Sign in</h1>
          <p className="muted">
            Use a demo account. Seeded mock data is ready so you can walk enroll → submit → evaluate.
          </p>
          <Banner>{error}</Banner>
          <div className="row demo-row">
            {DEMOS.map((demo) => (
              <button
                key={demo.role}
                className={`demo-chip${email === demo.email ? ' on' : ''}`}
                type="button"
                onClick={() => {
                  setEmail(demo.email);
                  setPassword(demo.password);
                }}
              >
                {demo.role}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div className="field">
              <label>Password</label>
              <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button className="btn" disabled={busy} type="submit">
              {busy ? 'Signing in…' : 'Continue'}
            </button>
          </form>
          <p className="muted auth-foot">
            New student? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
