import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Banner, Badge, EmptyState, PageHeader, Spinner } from '../components/Ui';
import { useToast } from '../components/Toast';
import { dueLabel, formatDate, isOverdue, plainText } from '../utils/format';

export default function CourseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [learners, setLearners] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', maxMarks: 100, section: '' });
  const [editForm, setEditForm] = useState({ title: '', description: '', isPublished: true });
  const [busy, setBusy] = useState(false);
  const [sections, setSections] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [sectionTitle, setSectionTitle] = useState('');
  const [lessonForm, setLessonForm] = useState({ sectionId: '', title: '', content: '' });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [quizTitle, setQuizTitle] = useState('Module quiz');

  const load = async () => {
    setError('');
    try {
      const c = await api(`/api/courses/${id}`);
      setCourse(c.data);
      setEditForm({
        title: c.data.title,
        description: c.data.description,
        isPublished: c.data.isPublished,
      });
      if (user.role !== 'student' || c.data.enrolled) {
        const a = await api(`/api/courses/${id}/assignments`);
        setAssignments(a.data);
      } else {
        setAssignments([]);
      }
      if (user.role !== 'student') {
        const people = await api(`/api/courses/${id}/enrollments`);
        setLearners(people.data);
      }
      try {
        const cur = await api(`/api/courses/${id}/curriculum`);
        setSections(cur.data || []);
      } catch {
        setSections([]);
      }
      try {
        const r = await api(`/api/courses/${id}/reviews`);
        setReviews(r.data || []);
      } catch {
        setReviews([]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const enroll = async () => {
    try {
      await api(`/api/courses/${id}/enroll`, { method: 'POST' });
      toast.push('You are enrolled');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveCourse = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/courses/${id}`, { method: 'PUT', body: editForm });
      toast.push('Course updated');
      setEditing(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const createAssignment = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/courses/${id}/assignments`, {
        method: 'POST',
        body: {
          ...form,
          dueDate: new Date(form.dueDate).toISOString(),
          maxMarks: Number(form.maxMarks),
          section: form.section || sections[0]?._id || null,
        },
      });
      setForm({ title: '', description: '', dueDate: '', maxMarks: 100, section: sections[0]?._id || '' });
      toast.push('Assignment published');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeCourse = async () => {
    if (!window.confirm('Delete this course and its assignments?')) return;
    try {
      await api(`/api/courses/${id}`, { method: 'DELETE' });
      toast.push('Course deleted');
      navigate('/courses');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!course) {
    return error ? (
      <div className="card">
        <Banner>{error}</Banner>
        <div style={{ marginTop: 16 }}>
          <Link className="btn secondary" to="/courses">
            ← Back to courses
          </Link>
        </div>
      </div>
    ) : (
      <Spinner label="Loading course…" />
    );
  }

  const canManage =
    user.role === 'admin' ||
    (user.role === 'trainer' && String(course.trainer?._id) === String(user.id));

  return (
    <div>
      <PageHeader
        title={course.title}
        subtitle={`${course.trainer?.name || 'Trainer'} · ${course.enrollmentCount || 0} enrolled`}
        actions={
          <>
            <Badge tone={course.status === 'PUBLISHED' ? 'ok' : 'warn'}>{course.status || 'DRAFT'}</Badge>
            {course.level && <Badge>{course.level}</Badge>}
            <Badge>{course.price ? `₹${course.price}` : 'Free'}</Badge>
            {canManage && (
              <button className="btn secondary" type="button" onClick={() => setEditing((v) => !v)}>
                {editing ? 'Close editor' : 'Edit course'}
              </button>
            )}
          </>
        }
      />
      <Banner>{error}</Banner>
      <div className="card">
        <p>{course.description}</p>
        <div className="row">
          {user.role === 'student' && !course.enrolled && Number(course.price) > 0 && (
            <Link className="btn" to={`/courses/${id}/checkout`}>Buy with dummy payment</Link>
          )}
          {user.role === 'student' && !course.enrolled && !Number(course.price) && (
            <button className="btn" type="button" onClick={enroll}>Enroll in course</button>
          )}
          {user.role === 'student' && course.enrolled && (
            <>
              <Badge tone="ok">You are enrolled</Badge>
              <Link className="btn" to={`/courses/${id}/learn`}>Continue learning</Link>
              <Link className="btn secondary" to={`/courses/${id}/quiz`}>Take quiz</Link>
            </>
          )}
          {canManage && user.role === 'trainer' && course.status !== 'PENDING_REVIEW' && course.status !== 'PUBLISHED' && (
            <button
              className="btn"
              type="button"
              onClick={async () => {
                try {
                  await api(`/api/courses/${id}/submit-review`, { method: 'POST' });
                  toast.push('Submitted for admin review');
                  await load();
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              Submit for review
            </button>
          )}
          {user.role === 'admin' && course.status === 'PENDING_REVIEW' && (
            <>
              <button
                className="btn"
                type="button"
                onClick={async () => {
                  try {
                    await api(`/api/courses/${id}/approve`, { method: 'POST' });
                    toast.push('Course approved and published');
                    await load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                Approve course
              </button>
              <button
                className="btn danger"
                type="button"
                onClick={async () => {
                  try {
                    await api(`/api/courses/${id}/reject`, {
                      method: 'POST',
                      body: { comment: 'Please revise curriculum or assignments before publishing.' },
                    });
                    toast.push('Course sent back to trainer');
                    await load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                Reject course
              </button>
            </>
          )}
          {canManage && (
            <button className="btn danger" type="button" onClick={removeCourse}>Delete course</button>
          )}
        </div>
      </div>

      {editing && canManage && (
        <form className="card" onSubmit={saveCourse}>
          <h3>Edit course</h3>
          <div className="field">
            <label>Title</label>
            <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} required />
          </div>
          <label className="row">
            <input
              type="checkbox"
              checked={editForm.isPublished}
              onChange={(e) => setEditForm({ ...editForm, isPublished: e.target.checked })}
              style={{ width: 'auto' }}
            />
            Published and visible to students
          </label>
          <div style={{ marginTop: 12 }}>
            <button className="btn" disabled={busy} type="submit">Save changes</button>
          </div>
        </form>
      )}

      {user.role === 'student' && course.enrolled && (
        <div className="card">
          <h3>Study documents</h3>
          <p className="muted">Read the section documents, then complete the assignment for that section.</p>
          {sections.length === 0 && <p className="muted">No study documents yet.</p>}
          {sections.map((section) => (
            <div key={section._id} style={{ marginBottom: 12 }}>
              <strong>{section.title}</strong>
              <ul>
                {(section.lessons || []).map((lesson) => (
                  <li key={lesson._id}>{lesson.title}</li>
                ))}
              </ul>
            </div>
          ))}
          <Link className="btn" to={`/courses/${id}/learn`}>Open learning path</Link>
        </div>
      )}

      {canManage && (
        <div className="card">
          <h3>Study documents</h3>
          <p className="muted">
            {course.status === 'PUBLISHED'
              ? 'The course is approved. Add the next study section without another review.'
              : sections.length
                ? 'Section 1 is ready. Submit for admin approval. Later sections will not need another review.'
                : 'Add Section 1 now. After admin approval you can upload later sections without another review.'}
          </p>
          {sections.map((section) => (
            <div key={section._id} style={{ marginBottom: 12 }}>
              <strong>{section.title}</strong>
              <ul>
                {(section.lessons || []).map((lesson) => (
                  <li key={lesson._id}>{lesson.title}</li>
                ))}
              </ul>
            </div>
          ))}
          {(course.status === 'PUBLISHED' || sections.length === 0 || user.role === 'admin') && (
          <form
            className="row"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api(`/api/courses/${id}/sections`, { method: 'POST', body: { title: sectionTitle } });
                setSectionTitle('');
                toast.push('Section added');
                await load();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <input
              placeholder={sections.length === 0 ? 'Section 1 title' : `Section ${sections.length + 1} title`}
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              required
            />
            <button className="btn secondary" type="submit">Add section</button>
          </form>
          )}
          {sections.length > 0 && (
            <form
              style={{ marginTop: 12 }}
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api(`/api/sections/${lessonForm.sectionId || sections[0]._id}/lessons`, {
                    method: 'POST',
                    body: { title: lessonForm.title, content: lessonForm.content, type: 'TEXT' },
                  });
                  setLessonForm({ sectionId: sections[0]._id, title: '', content: '' });
                  toast.push('Study document added');
                  await load();
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              <div className="field">
                <label>Section</label>
                <select
                  value={lessonForm.sectionId || sections[0]?._id || ''}
                  onChange={(e) => setLessonForm({ ...lessonForm, sectionId: e.target.value })}
                >
                  {(course.status === 'PUBLISHED' || user.role === 'admin' ? sections : sections.slice(0, 1)).map((s) => (
                    <option key={s._id} value={s._id}>{s.title}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Study document title</label>
                <input
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Study document</label>
                <textarea
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  required
                />
              </div>
              <button className="btn" type="submit">Add study document</button>
            </form>
          )}
          <form
            style={{ marginTop: 16 }}
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api(`/api/courses/${id}/quizzes`, {
                  method: 'POST',
                  body: {
                    title: quizTitle,
                    passingScore: 70,
                    timeLimitMin: 10,
                    questions: [
                      {
                        text: 'Which statement is true about this course?',
                        options: ['Learners can complete lessons', 'Quizzes are optional forever', 'Progress is never saved', 'Certificates are random'],
                        correctIndex: 0,
                      },
                      {
                        text: 'When is a certificate issued?',
                        options: ['On enroll', 'After all lessons and a passing quiz', 'After payment only', 'Never'],
                        correctIndex: 1,
                      },
                    ],
                  },
                });
                toast.push('Quiz created');
                setQuizTitle('Module quiz');
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <div className="field">
              <label>Quiz title</label>
              <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} required />
            </div>
            <button className="btn secondary" type="submit">Add starter quiz</button>
          </form>
        </div>
      )}

      <div className="card">
        <h3>Reviews</h3>
        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
        {reviews.map((r) => (
          <p key={r._id}>
            <strong>{r.student?.name || 'Student'}</strong> · {r.rating}/5
            <span className="muted"> — {plainText(r.comment)}</span>
          </p>
        ))}
        {user.role === 'student' && course.enrolled && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api(`/api/courses/${id}/reviews`, { method: 'POST', body: reviewForm });
                toast.push('Review saved');
                setReviewForm({ rating: 5, comment: '' });
                await load();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <div className="field">
              <label>Rating</label>
              <select
                value={reviewForm.rating}
                onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Comment</label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              />
            </div>
            <button className="btn secondary" type="submit">Submit review</button>
          </form>
        )}
      </div>

      <h2>Assignments</h2>
      {user.role === 'student' && !course.enrolled && (
        <EmptyState title="Enrollment required" text="Join this course to view and submit assignments." />
      )}
      {assignments.length === 0 && (user.role !== 'student' || course.enrolled) && (
        <EmptyState title="No assignments yet" text="Trainers can create the first assignment below." />
      )}
      {assignments.map((a) => (
        <article className="card" key={a._id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>{a.title}</h3>
            <Badge tone={isOverdue(a.dueDate) ? 'danger' : 'warn'}>{dueLabel(a.dueDate)}</Badge>
          </div>
          <p className="muted">{a.description}</p>
          <p className="muted">
            {a.section?.title ? `Based on ${a.section.title} · ` : ''}
            Due {formatDate(a.dueDate)} · Maximum {a.maxMarks} marks
          </p>
          {user.role === 'student' && course.enrolled && a.section && (
            <Link className="btn secondary" to={`/courses/${id}/learn`}>Read {a.section.title}</Link>
          )}
          {user.role === 'student' && <StudentSubmit assignment={a} onDone={load} />}
          {canManage && (
            <Link className="btn secondary" to={`/assignments/${a._id}/submissions`}>
              Review submissions
            </Link>
          )}
        </article>
      ))}

      {canManage && (
        <>
          <div className="card">
            <h3>Create assignment</h3>
            {course.status !== 'PUBLISHED' && user.role === 'trainer' ? (
              <p className="muted">Assignments open after the course is approved. Students will use the section study documents to complete them.</p>
            ) : (
            <form onSubmit={createAssignment}>
              <div className="field">
                <label>Study section</label>
                <select
                  value={form.section || sections[0]?._id || ''}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  required
                >
                  {sections.map((s) => (
                    <option key={s._id} value={s._id}>{s.title}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="field">
                <label>Brief</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="field">
                <label>Due date</label>
                <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
              </div>
              <div className="field">
                <label>Maximum marks</label>
                <input type="number" min="1" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} required />
              </div>
              <button className="btn" disabled={busy} type="submit">
                {busy ? 'Saving…' : 'Publish assignment'}
              </button>
            </form>
            )}
          </div>
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h3>Enrolled learners</h3>
              <Badge tone="ok">{learners.length} {learners.length === 1 ? 'student' : 'students'}</Badge>
            </div>
            {learners.length === 0 ? (
              <p className="muted">No enrollments yet. Students who join this course will appear here.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Enrolled on</th>
                  </tr>
                </thead>
                <tbody>
                  {learners.map((row) => (
                    <tr key={row._id}>
                      <td><strong>{row.student?.name || 'Student'}</strong></td>
                      <td>{row.student?.email || '—'}</td>
                      <td className="muted">{formatDate(row.enrolledAt || row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StudentSubmit({ assignment, onDone }) {
  const toast = useToast();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const existing = assignment.mySubmission;
  const late = isOverdue(assignment.dueDate);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/api/assignments/${assignment._id}/submit`, { method: 'POST', body: { content } });
      setContent('');
      toast.push('Submission received');
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (existing) {
    return (
      <div>
        <Badge tone={existing.status === 'EVALUATED' ? 'ok' : 'warn'}>{existing.status}</Badge>
        {existing.status === 'EVALUATED' && (
          <p>
            <strong>{existing.marks} / {assignment.maxMarks}</strong>
            <span className="muted"> · {plainText(existing.feedback) || 'No written feedback'}</span>
          </p>
        )}
        <p className="muted">Your answer: {plainText(existing.content)}</p>
      </div>
    );
  }

  if (late) {
    return <Banner>The due date has passed. Late submissions are not accepted.</Banner>;
  }

  return (
    <form onSubmit={submit}>
      <Banner>{error}</Banner>
      <div className="field">
        <label>Your answer</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} required minLength={10} />
      </div>
      <button className="btn" disabled={busy} type="submit">
        {busy ? 'Submitting…' : 'Submit assignment'}
      </button>
    </form>
  );
}
