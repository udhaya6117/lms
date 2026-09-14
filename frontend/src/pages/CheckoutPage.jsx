import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Banner, PageHeader, Spinner } from '../components/Ui';
import { useToast } from '../components/Toast';

export default function CheckoutPage() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/api/courses/${id}`)
      .then((res) => setCourse(res.data))
      .catch((err) => setError(err.message));
  }, [id]);

  const pay = async (succeed) => {
    setBusy(true);
    try {
      await api('/api/payments/dummy', { method: 'POST', body: { courseId: id, succeed } });
      if (succeed) {
        toast.push('Payment successful. You are enrolled.');
        navigate(`/courses/${id}/learn`);
      } else {
        setError('Dummy payment failed. Try Pay now again.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!course) return error ? <Banner>{error}</Banner> : <Spinner />;

  return (
    <div>
      <PageHeader
        title="Dummy checkout"
        subtitle="No real card is charged. Success creates a payment record and enrollment."
        actions={
          <Link className="btn secondary" to={`/courses/${id}`}>
            ← Cancel and return
          </Link>
        }
      />
      <Banner>{error}</Banner>
      <div className="card">
        <h3>{course.title}</h3>
        <p>Amount: ₹{course.price || 0}</p>
        <p className="muted">Card: **** **** 4242 · Dummy method</p>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" disabled={busy} type="button" onClick={() => pay(true)}>
            Pay ₹{course.price || 0}
          </button>
          <button className="btn secondary" disabled={busy} type="button" onClick={() => pay(false)}>
            Simulate failure
          </button>
          <Link className="btn secondary" to={`/courses/${id}`}>
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
