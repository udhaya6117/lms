import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Banner, PageHeader } from '../components/Ui';
import { useToast } from '../components/Toast';

export default function AdminCategoriesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [removeItem, setRemoveItem] = useState(null);

  const load = () =>
    api('/api/categories')
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api(`/api/categories/${editing}`, { method: 'PUT', body: form });
        toast.push('Category updated');
      } else {
        await api('/api/categories', { method: 'POST', body: form });
        toast.push('Category created');
      }
      setForm({ name: '', description: '' });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (c) => {
    setEditing(c._id);
    setForm({ name: c.name, description: c.description || '' });
  };

  const confirmDelete = async () => {
    if (!removeItem) return;
    try {
      await api(`/api/categories/${removeItem._id}`, { method: 'DELETE' });
      if (editing === removeItem._id) {
        setEditing(null);
        setForm({ name: '', description: '' });
      }
      setRemoveItem(null);
      toast.push('Category deleted');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PageHeader title="Categories" subtitle="Organize the catalog by topic so students can filter courses." />
      <Banner>{error}</Banner>
      <div className="page-split">
        <form className="card" onSubmit={save}>
          <h3>{editing ? 'Edit category' : 'Add category'}</h3>
          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="row">
            <button className="btn" type="submit">{editing ? 'Save changes' : 'Create'}</button>
            {editing && (
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm({ name: '', description: '' });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        <div className="grid">
          {items.map((c) => (
            <article className="card" key={c._id}>
              <h3>{c.name}</h3>
              <p className="muted">{c.description || '—'}</p>
              <div className="row-actions">
                <button className="btn secondary" type="button" onClick={() => startEdit(c)}>Edit</button>
                <button className="btn danger" type="button" onClick={() => setRemoveItem(c)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {removeItem && (
        <div className="modal-back" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Delete category?</h3>
            <p className="muted">{removeItem.name} will be removed. This cannot be undone.</p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
              <button className="btn secondary" type="button" onClick={() => setRemoveItem(null)}>Cancel</button>
              <button className="btn danger" type="button" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
