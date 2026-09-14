import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Banner, Badge, EmptyState, PageHeader } from '../components/Ui';

export default function AdminPaymentsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/payments')
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message));
  }, []);

  const success = items.filter((p) => p.status === 'SUCCESS').length;
  const failed = items.filter((p) => p.status === 'FAILED').length;
  const revenue = items.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div>
      <PageHeader title="Dummy payments" subtitle="No real gateway — success creates enrollment and course access." />
      <Banner>{error}</Banner>
      <div className="stats">
        <div className="stat"><span className="muted">Transactions</span><b>{items.length}</b></div>
        <div className="stat"><span className="muted">Successful</span><b>{success}</b></div>
        <div className="stat"><span className="muted">Failed</span><b>{failed}</b></div>
        <div className="stat"><span className="muted">Revenue (₹)</span><b>{revenue}</b></div>
      </div>
      {items.length === 0 && <EmptyState title="No transactions yet" text="Students use Pay now on paid courses." />}
      {items.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Student</th>
                <th>Course</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id}>
                  <td>{p.transactionId}</td>
                  <td>{p.student?.name || p.student?.email}</td>
                  <td>{p.course?.title}</td>
                  <td>₹{p.amount}</td>
                  <td><Badge tone={p.status === 'SUCCESS' ? 'ok' : 'danger'}>{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
