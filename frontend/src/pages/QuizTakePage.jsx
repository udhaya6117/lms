import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Banner, Badge, PageHeader, Spinner } from '../components/Ui';

export default function QuizTakePage() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    api(`/api/courses/${id}/quizzes`)
      .then((res) => {
        const first = res.data[0];
        setQuiz(first || null);
        setSeconds((first?.timeLimitMin || 10) * 60);
        if (!first) setError('No quiz published for this course yet.');
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!quiz || result) return undefined;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [quiz, result]);

  const submit = async () => {
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, selectedIndex]) => ({
          questionId,
          selectedIndex,
        })),
      };
      const res = await api(`/api/quizzes/${quiz._id}/attempt`, { method: 'POST', body: payload });
      setResult(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!quiz && !error) return <Spinner label="Loading quiz…" />;

  return (
    <div>
      <PageHeader
        title={quiz?.title || 'Quiz'}
        subtitle={result ? 'Result' : `Time left ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
        actions={
          <div className="row">
            <Link className="btn secondary" to={`/courses/${id}/learn`}>
              ← Classroom
            </Link>
            <Link className="btn secondary" to={`/courses/${id}`}>
              Course overview
            </Link>
          </div>
        }
      />
      <Banner>{error}</Banner>
      {result && (
        <div className="card">
          <h3>Score {result.score}%</h3>
          <Badge tone={result.passed ? 'ok' : 'danger'}>{result.passed ? 'PASSED' : 'NOT PASSED'}</Badge>
          <p className="muted">Passing score {quiz.passingScore}%</p>
          <div className="row" style={{ marginTop: 16 }}>
            {result.passed ? (
              <>
                <Link className="btn" to="/certificates">Open certificates</Link>
                <Link className="btn secondary" to={`/courses/${id}/learn`}>Back to classroom</Link>
              </>
            ) : (
              <>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                    setSeconds((quiz?.timeLimitMin || 10) * 60);
                  }}
                >
                  Retake quiz
                </button>
                <Link className="btn secondary" to={`/courses/${id}/learn`}>Review lessons</Link>
                <Link className="btn secondary" to={`/courses/${id}`}>Course overview</Link>
              </>
            )}
          </div>
        </div>
      )}
      {!result && quiz && (
        <div className="card">
          {quiz.questions?.map((q, idx) => (
            <div key={q._id} className="field">
              <label>{idx + 1}. {q.text}</label>
              {(q.options || []).map((opt, i) => (
                <label key={opt} className="row">
                  <input
                    type="radio"
                    name={q._id}
                    checked={answers[q._id] === i}
                    onChange={() => setAnswers({ ...answers, [q._id]: i })}
                    style={{ width: 'auto' }}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ))}
          <button className="btn" type="button" onClick={submit} disabled={seconds === 0}>
            Submit quiz
          </button>
        </div>
      )}
    </div>
  );
}
