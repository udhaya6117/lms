import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Banner, Badge, PageHeader, Spinner } from '../components/Ui';
import { plainText } from '../utils/format';
import { useToast } from '../components/Toast';

export default function LearnPage() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [progress, setProgress] = useState({ percent: 0 });
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [c, cur, p, a] = await Promise.all([
        api(`/api/courses/${id}`),
        api(`/api/courses/${id}/curriculum`),
        api(`/api/courses/${id}/progress`),
        api(`/api/courses/${id}/assignments`).catch(() => ({ data: [] })),
      ]);
      setCourse(c.data);
      setSections(cur.data);
      setAssignments(a.data || []);
      setProgress(p.data);
      const first = cur.data.flatMap((s) => s.lessons).find((l) => !l.completed) || cur.data[0]?.lessons?.[0];
      setActive(first || null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const complete = async (lesson) => {
    try {
      await api(`/api/lessons/${lesson._id}/complete`, { method: 'POST' });
      toast.push('Lesson completed');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!course) return error ? <Banner>{error}</Banner> : <Spinner label="Opening classroom…" />;

  return (
    <div>
      <PageHeader
        title={course.title}
        subtitle={`Progress ${progress.percent || 0}% · Read the study documents, then complete the section assignment`}
        actions={
          <>
            <Link className="btn secondary" to={`/courses/${id}`}>← Course details</Link>
            <Link className="btn secondary" to={`/courses/${id}/quiz`}>Take quiz</Link>
            {progress.certificate && <Link className="btn" to="/certificates">Certificate</Link>}
          </>
        }
      />
      <Banner>{error}</Banner>
      <div className="progress-bar"><span style={{ width: `${progress.percent || 0}%` }} /></div>
      <div className="learn-grid">
        <aside className="card">
          {sections.map((section) => (
            <div key={section._id} style={{ marginBottom: 16 }}>
              <strong>{section.title}</strong>
              {section.lessons.map((lesson) => (
                <button
                  key={lesson._id}
                  type="button"
                  className={`lesson-link ${active?._id === lesson._id ? 'on' : ''}`}
                  onClick={() => setActive(lesson)}
                >
                  {lesson.completed ? '✓' : '○'} {lesson.title}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <article className="card">
          {!active && <p className="muted">No lessons yet.</p>}
          {active && (
            <>
              <h3>{active.title}</h3>
              <Badge>Study document</Badge>
              <p>{plainText(active.content)}</p>
              {active.videoUrl && (
                <p><a href={active.videoUrl} target="_blank" rel="noreferrer">Open video</a></p>
              )}
              {!active.completed && (
                <button className="btn" type="button" onClick={() => complete(active)}>
                  Mark complete
                </button>
              )}
              {assignments
                .filter((item) => String(item.section?._id || item.section) === String(active.section))
                .map((item) => (
                  <p key={item._id} className="muted" style={{ marginTop: 16 }}>
                    Assignment for this section: <Link to={`/courses/${id}`}>{item.title}</Link>
                  </p>
                ))}
            </>
          )}
        </article>
      </div>
    </div>
  );
}
