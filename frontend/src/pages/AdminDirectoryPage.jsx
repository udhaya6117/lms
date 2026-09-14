import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Banner, Badge, PageHeader } from '../components/Ui';
import { useToast } from '../components/Toast';

export default function AdminDirectoryPage({ role }) {
  const toast = useToast();
  const isTrainer = role === 'trainer';
  const title = isTrainer ? 'Trainers' : 'Students';
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [counts, setCounts] = useState({ trainers: 0, students: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [removeUser, setRemoveUser] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = async (nextPage = page) => {
    try {
      const qs = new URLSearchParams({ page: nextPage, limit: 15, role, search });
      const res = await api(`/api/users?${qs}`);
      setUsers(res.data);
      setPagination(res.pagination);
      setCounts(res.counts);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    setPage(1);
    setSearch('');
    setError('');
    setRemoveUser(null);
  }, [role]);

  useEffect(() => {
    load(page);
  }, [page, role]);

  const toggle = async (user) => {
    try {
      await api(`/api/users/${user.id}`, {
        method: 'PUT',
        body: { isActive: !user.isActive },
      });
      toast.push(user.isActive ? 'Account disabled' : 'Account enabled');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!removeUser) return;
    setRemoving(true);
    setError('');
    try {
      await api(`/api/users/${removeUser.id}`, { method: 'DELETE' });
      setRemoveUser(null);
      toast.push(`${isTrainer ? 'Trainer' : 'Student'} deleted`);
      await load(1);
      setPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={
          isTrainer
            ? 'Faculty only. Create trainers and manage who can own courses.'
            : 'Learners only. Create students and manage who can enroll and submit work.'
        }
        actions={
          <Link className="btn" to={isTrainer ? '/admin/trainers/new' : '/admin/students/new'}>
            Create {isTrainer ? 'trainer' : 'student'}
          </Link>
        }
      />
      <Banner>{error}</Banner>
      <div className="stats">
        <div className="stat">
          <span className="muted">{title} in this list</span>
          <b>{pagination.total}</b>
        </div>
        <div className="stat">
          <span className="muted">All trainers</span>
          <b>{counts.trainers}</b>
        </div>
        <div className="stat">
          <span className="muted">All students</span>
          <b>{counts.students}</b>
        </div>
      </div>

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load(1);
        }}
      >
        <input
          placeholder={`Search ${title.toLowerCase()} by name or email`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn secondary" type="submit">Search</button>
      </form>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <Badge tone={u.isActive ? 'ok' : 'danger'}>{u.isActive ? 'Active' : 'Disabled'}</Badge>
                </td>
                <td>
                  <div className="row-actions">
                    <Link
                      className="btn secondary"
                      to={`${isTrainer ? '/admin/trainers' : '/admin/students'}/${u.id}/edit`}
                      state={{ user: u }}
                    >
                      Edit
                    </Link>
                    <button className="btn secondary" type="button" onClick={() => toggle(u)}>
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn danger" type="button" onClick={() => setRemoveUser(u)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn secondary" disabled={page <= 1} type="button" onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="muted">
            Page {pagination.page} of {pagination.pages} · {pagination.total} {title.toLowerCase()}
          </span>
          <button className="btn secondary" disabled={page >= pagination.pages} type="button" onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>

      {removeUser && (
        <div className="modal-back" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Delete {isTrainer ? 'trainer' : 'student'}?</h3>
            <p className="muted">
              {removeUser.name} ({removeUser.email}) will be removed. This cannot be undone.
            </p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
              <button className="btn secondary" type="button" onClick={() => setRemoveUser(null)} disabled={removing}>
                Cancel
              </button>
              <button className="btn danger" type="button" onClick={confirmDelete} disabled={removing}>
                {removing ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
