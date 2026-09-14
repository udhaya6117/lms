import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Banner, Badge, EmptyState, Spinner } from '../components/Ui';
import { dueLabel, formatDate, plainText } from '../utils/format';

const TONE = {
  student: 'Keep momentum on lessons, quizzes, and due work.',
  trainer: 'Publish curriculum, review submissions, and grow your cohort.',
  admin: 'Approvals, campus health, and payments in one place.',
};

function greetingClock() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function maxVal(series = []) {
  return Math.max(1, ...series.map((p) => Number(p.value) || 0));
}

function BarChart({ series = [], caption }) {
  const peak = maxVal(series);
  const top = series.reduce((best, point) => (Number(point.value) > Number(best.value) ? point : best), series[0] || { value: 0 });
  return (
    <div>
      <div className="chart-bars" role="img" aria-label={caption || 'Trend chart'}>
        {series.map((point) => (
          <div className={`chart-col${point.label === top.label ? ' on' : ''}`} key={point.label}>
            <div className="chart-track">
              <span style={{ height: `${Math.round((Number(point.value) / peak) * 100)}%` }} />
            </div>
            <em>{point.label}</em>
          </div>
        ))}
      </div>
      {caption && <p className="muted chart-caption">{caption}</p>}
    </div>
  );
}

function mixTone(label) {
  const key = String(label).toLowerCase();
  if (key.includes('publish') || key.includes('evaluat') || key.includes('success') || key.includes('active')) return 'lime';
  if (key.includes('pending') || key.includes('submit') || key.includes('draft')) return 'amber';
  if (key.includes('trainer')) return 'ink';
  if (key.includes('student')) return 'mint';
  if (key.includes('fail') || key.includes('reject') || key.includes('overdue')) return 'rose';
  return 'slate';
}

function MixList({ items = [] }) {
  const total = items.reduce((sum, i) => sum + Number(i.value || 0), 0) || 1;
  return (
    <div className="mix-list">
      {items.map((item) => {
        const value = Number(item.value || 0);
        const pct = Math.round((value / total) * 100);
        return (
          <div className={`mix-item tone-${mixTone(item.label)}`} key={item.label}>
            <div className="mix-item-top">
              <span className="mix-dot" aria-hidden="true" />
              <span className="mix-label">{item.label}</span>
              <strong className="mix-value">{item.value}</strong>
            </div>
            <div className="mini-bar" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </div>
            <span className="mix-pct">{pct}%</span>
          </div>
        );
      })}
      {items.length === 0 && <p className="muted">No mix data yet.</p>}
    </div>
  );
}

function Kpi({ stat }) {
  return (
    <article className={`kpi kpi-${stat.tone || 'slate'}`}>
      <span className="muted">{stat.label}</span>
      <b>{stat.value}</b>
      {stat.hint && <p className="kpi-hint">{stat.hint}</p>}
    </article>
  );
}

function Ring({ value }) {
  const p = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="ring" style={{ '--p': p }}>
      <span>{p}%</span>
    </div>
  );
}

function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const label = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const cells = [...Array(start).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="cal">
      <div className="cal-head">
        <strong>{label}</strong>
      </div>
      <div className="cal-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span className="cal-dow" key={`${d}-${i}`}>{d}</span>
        ))}
        {cells.map((day, i) => (
          <span key={i} className={`cal-day${day === now.getDate() ? ' today' : ''}`}>{day || ''}</span>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api('/api/dashboard')
      .then((res) => setPayload(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  if (loading) return <Spinner label="Building your workspace…" />;

  const featured =
    user.role === 'student'
      ? (payload?.learning || []).slice(0, 3)
      : (payload?.courses || []).slice(0, 3);

  return (
    <div className={`dash dash-${user.role}`}>
      <section className="dash-intro">
        <div>
          <p className="dash-kicker">{today}</p>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            {greetingClock()}, {user.name.split(' ')[0]}. {TONE[user.role] || TONE.admin}
          </p>
        </div>
        <div className="dash-hero-actions">
          <Badge tone="ok">{user.role}</Badge>
          {user.role === 'student' && (
            <>
              <Link className="btn" to="/courses">Browse catalog</Link>
              <Link className="btn secondary" to="/certificates">Certificates</Link>
            </>
          )}
          {user.role === 'trainer' && (
            <>
              <Link className="btn" to="/trainer">New course</Link>
              <Link className="btn secondary" to="/courses">My catalog</Link>
            </>
          )}
          {user.role === 'admin' && (
            <>
              <Link className="btn" to="/admin/approvals">Review queue</Link>
              <Link className="btn secondary" to="/admin/payments">Payments</Link>
            </>
          )}
        </div>
      </section>

      <Banner>{error}</Banner>

      <div className="dash-top">
        <div>
          <div className="section-head">
            <h3>{user.role === 'student' ? 'Continue learning' : user.role === 'trainer' ? 'Course health' : 'Top courses by enrollment'}</h3>
            <Link to={user.role === 'trainer' ? '/trainer' : user.role === 'student' ? '/my-courses' : '/courses'}>
              {user.role === 'trainer' ? 'Manage' : user.role === 'student' ? 'All courses' : 'All courses'}
            </Link>
          </div>
          <div className="feature-grid">
            {featured.length ? featured.map((course) => (
              <Link className="feature-card" key={course._id} to={`/courses/${course._id}${user.role === 'student' ? '/learn' : ''}`}>
                <span className="feature-ic">{(course.title || 'C')[0]}</span>
                <strong>{course.title}</strong>
                <p className="muted">
                  {user.role === 'student'
                    ? `${course.trainer || 'Trainer'} · ${course.completedLessons}/${course.lessons} lessons`
                    : `${course.trainer || course.level || 'Beginner'} · ${course.learners || 0} learners`}
                </p>
                {user.role === 'student' ? (
                  <div className="feature-meta">
                    <span>{course.percent}%</span>
                    <div className="progress-bar"><span style={{ width: `${course.percent}%` }} /></div>
                  </div>
                ) : (
                  <Badge tone={course.status === 'PUBLISHED' ? 'ok' : 'warn'}>{course.status || 'DRAFT'}</Badge>
                )}
              </Link>
            )) : (
              <div className="feature-card">
                <EmptyState
                  title={user.role === 'student' ? 'No enrollments yet' : 'No courses yet'}
                  text={user.role === 'student' ? 'Open the catalog and join a published course.' : user.role === 'trainer' ? 'Create a draft from Teach.' : 'Trainers have not published yet.'}
                />
              </div>
            )}
          </div>
        </div>
        <aside className="promo-card">
          <h3>Reviewer walkthrough</h3>
          {user.role === 'student' && (
            <p>
              Open <Link to="/my-courses">My courses</Link> → <strong>Wrench Wise — Assignment Walkthrough</strong>.
              You already have one graded paper, one waiting for marks, one you can submit, and one late assignment that is blocked.
            </p>
          )}
          {user.role === 'trainer' && (
            <p>
              Open <Link to="/courses">My courses</Link> → <strong>Wrench Wise — Assignment Walkthrough</strong> →
              Review submissions on <em>Waiting for marks</em> and save marks plus feedback.
            </p>
          )}
          {user.role === 'admin' && (
            <p>
              <Link to="/admin/approvals">Approvals</Link> has Full-Stack Capstone.
              Directories under Trainers and Students are pre-filled.
            </p>
          )}
        </aside>
      </div>

      {payload && (
        <>
          <div className="kpi-grid">
            {(payload.stats || []).map((stat) => (
              <Kpi key={stat.label} stat={stat} />
            ))}
          </div>

          <div className="dash-mid">
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3>Enrollment trend</h3>
                <span className="muted">Last 12 days</span>
              </div>
              <BarChart series={payload.trend} caption="New enrollments by day" />
            </div>
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3>Activity</h3>
                <Link to="/notifications">Inbox</Link>
              </div>
              {payload.activity?.length ? (
                <ol className="activity">
                  {payload.activity.map((item) => (
                    <li key={item.id} className={item.read ? 'read' : ''}>
                      <strong>{item.title}</strong>
                      <p className="muted">{plainText(item.body)}</p>
                      <span className="muted">{formatDate(item.at)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">No notifications yet. Approvals, enrollments, and quiz results land here.</p>
              )}
            </div>
            <div className="card">
              <MiniCalendar />
            </div>
          </div>

          <div className="dash-row two">
            <div className="card">
              {user.role === 'student' && (
                <>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <h3>Continue learning</h3>
                    <Link to="/my-courses">All courses</Link>
                  </div>
                  {payload.learning?.length ? (
                    <div className="learn-stack">
                      {payload.learning.slice(0, 5).map((course) => (
                        <Link className="learn-row" key={course._id} to={`/courses/${course._id}/learn`}>
                          <div>
                            <strong>{course.title}</strong>
                            <p className="muted">{course.trainer || 'Trainer'} · {course.completedLessons}/{course.lessons} lessons</p>
                          </div>
                          <Ring value={course.percent} />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No enrollments yet" text="Open the catalog and join a published course." />
                  )}
                </>
              )}
              {user.role === 'trainer' && (
                <>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <h3>Course health</h3>
                    <Link to="/trainer">Manage</Link>
                  </div>
                  {payload.courses?.length ? (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>Status</th>
                          <th>Learners</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {payload.courses.slice(0, 8).map((c) => (
                          <tr key={c._id}>
                            <td>
                              <strong>{c.title}</strong>
                              <div className="muted">{c.level || 'Beginner'} · {c.price ? `₹${c.price}` : 'Free'}</div>
                            </td>
                            <td>
                              <Badge tone={c.status === 'PUBLISHED' ? 'ok' : 'warn'}>{c.status}</Badge>
                            </td>
                            <td>{c.learners}</td>
                            <td><Link to={`/courses/${c._id}`}>Open</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyState title="No courses yet" text="Create a draft from Teach." />
                  )}
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <h3>Top courses by enrollment</h3>
                    <Link to="/courses">All courses</Link>
                  </div>
                  {payload.courses?.length ? (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>Trainer</th>
                          <th>Learners</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payload.courses.map((c) => (
                          <tr key={c._id}>
                            <td><strong>{c.title}</strong></td>
                            <td>{c.trainer || '—'}</td>
                            <td>{c.learners}</td>
                            <td><Badge tone={c.status === 'PUBLISHED' ? 'ok' : 'warn'}>{c.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyState title="No courses" text="Trainers have not published yet." />
                  )}
                </>
              )}
            </div>
            <div className="card">
              <h3>
                {user.role === 'student' && 'Work due'}
                {user.role === 'trainer' && 'Evaluation queue'}
                {user.role === 'admin' && 'Approval queue'}
              </h3>
              {payload.queue?.length ? (
                <div className="assign-list">
                  {payload.queue.map((row) => (
                    <div className="assign-row" key={row.id}>
                      <div>
                        <strong>{row.title || row.assignmentTitle}</strong>
                        <p className="muted">
                          {user.role === 'student' && `${formatDate(row.dueDate)} · ${dueLabel(row.dueDate)}`}
                          {user.role === 'trainer' && row.studentName}
                          {user.role === 'admin' && row.trainerName}
                        </p>
                      </div>
                      {row.overdue && <Badge tone="danger">Overdue</Badge>}
                      {user.role === 'student' && <Link to={`/courses/${row.courseId}`}>Open</Link>}
                      {user.role === 'trainer' && (
                        <Link to={`/assignments/${row.assignmentId}/submissions`}>Review</Link>
                      )}
                      {user.role === 'admin' && <Link to="/admin/approvals">Decide</Link>}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Queue is clear"
                  text={
                    user.role === 'student'
                      ? 'No pending assignments right now.'
                      : user.role === 'trainer'
                        ? 'No submissions waiting for marks.'
                        : 'No courses waiting for review.'
                  }
                />
              )}
            </div>
          </div>

          <div className={`dash-row ${user.role === 'admin' ? 'three' : 'two'}`}>
            <div className="card mix-card">
              <div className="mix-block">
                <div className="mix-head">
                  <span className="mix-ic">S</span>
                  <h3>Snapshot</h3>
                </div>
                <MixList items={payload.mix} />
              </div>
              {user.role === 'admin' && payload.peopleMix && (
                <div className="mix-block">
                  <div className="mix-head">
                    <span className="mix-ic people">P</span>
                    <h3>People</h3>
                  </div>
                  <MixList items={payload.peopleMix} />
                </div>
              )}
            </div>
            {user.role === 'admin' && payload.payments?.length > 0 && (
              <div className="card pay-card">
                <div className="mix-head">
                  <span className="mix-ic">₹</span>
                  <h3>Latest payments</h3>
                </div>
                <div className="pay-list">
                  {payload.payments.map((p) => (
                    <div className={`pay-item ${p.status === 'SUCCESS' ? 'ok' : 'fail'}`} key={p.id}>
                      <span className="pay-dot" aria-hidden="true" />
                      <div className="pay-meta">
                        <strong>{p.transactionId}</strong>
                        <Badge tone={p.status === 'SUCCESS' ? 'ok' : 'danger'}>{p.status}</Badge>
                      </div>
                      <b className="pay-amt">₹{p.amount}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="card dash-shortcuts">
              <h3>Shortcuts</h3>
              {user.role === 'student' && (
                <div className="shortcut-grid">
                  <Link to="/my-courses">My courses</Link>
                  <Link to="/assignments">Assignments</Link>
                  <Link to="/submissions">Submissions</Link>
                  <Link to="/courses">Catalog</Link>
                  <Link to="/messages">Messages</Link>
                  <Link to="/notifications">Alerts</Link>
                </div>
              )}
              {user.role === 'trainer' && (
                <div className="shortcut-grid">
                  <Link to="/trainer">Create course</Link>
                  <Link to="/courses">Curriculum</Link>
                  <Link to="/messages">Messages</Link>
                  <Link to="/notifications">Alerts</Link>
                </div>
              )}
              {user.role === 'admin' && (
                <div className="shortcut-grid">
                  <Link to="/admin/trainers">Trainers</Link>
                  <Link to="/admin/students">Students</Link>
                  <Link to="/admin/categories">Categories</Link>
                  <Link to="/admin/approvals">Approvals</Link>
                  <Link to="/messages">Messages</Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
