import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { Banner, Spinner } from '../components/Ui';
import { useAuth } from '../context/AuthContext';
import { plainText } from '../utils/format';

function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?';
}

function personId(user = {}) {
  return String(user.id || user._id || '');
}

function shortTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const sameDay = new Date().toDateString() === date.toDateString();
  return date.toLocaleString(undefined, sameDay
    ? { hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const scroller = useRef(null);

  const loadLists = async () => {
    const [c, i] = await Promise.all([api('/api/messages/contacts'), api('/api/messages')]);
    setContacts(c.data || []);
    setInbox(i.data || []);
  };

  const loadThread = async (id) => {
    if (!id) {
      setThread([]);
      return;
    }
    const res = await api(`/api/messages/thread/${id}`);
    setThread(res.data || []);
    window.dispatchEvent(new Event('lms-inbox-refresh'));
  };

  useEffect(() => {
    setLoading(true);
    loadLists()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (user?.role === 'student' && roleFilter === 'student') setRoleFilter('all');
  }, [user, roleFilter]);

  useEffect(() => {
    if (!activeId) return undefined;
    loadThread(activeId).catch((err) => setError(err.message));
    const timer = setInterval(() => {
      loadThread(activeId).catch(() => {});
      loadLists().catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [activeId]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [thread, activeId]);

  const active = useMemo(
    () => contacts.find((c) => personId(c) === String(activeId)) || inbox.find((c) => personId(c.user) === String(activeId))?.user,
    [contacts, inbox, activeId]
  );

  const allowedIds = useMemo(() => new Set(contacts.map((c) => personId(c))), [contacts]);

  const people = useMemo(() => {
    const seen = new Set();
    const rows = [];
    inbox.forEach((row) => {
      const id = personId(row.user);
      if (!id || seen.has(id) || !allowedIds.has(id)) return;
      seen.add(id);
      rows.push(row);
    });
    contacts.forEach((c) => {
      const id = personId(c);
      if (!id || seen.has(id)) return;
      seen.add(id);
      rows.push({ user: c, lastMessage: 'Start a conversation', lastAt: null, unread: 0, fresh: true });
    });
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== 'all' && row.user.role !== roleFilter) return false;
      if (!q) return true;
      return `${row.user.name} ${row.user.email} ${row.user.role} ${row.lastMessage}`.toLowerCase().includes(q);
    });
  }, [allowedIds, contacts, inbox, query, roleFilter]);

  const filters = user?.role === 'student'
    ? [['all', 'All'], ['trainer', 'Trainers'], ['admin', 'Admins']]
    : [['all', 'All'], ['trainer', 'Trainers'], ['student', 'Students'], ['admin', 'Admins']];

  const sideHint = user?.role === 'student'
    ? 'Only your course trainers and admins'
    : user?.role === 'trainer'
      ? 'Your students, other trainers, and admins'
      : 'Coordinate with your team';

  const send = async (e) => {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api('/api/messages', { method: 'POST', body: { to: activeId, body: draft.trim() } });
      setDraft('');
      await Promise.all([loadThread(activeId), loadLists()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Opening messages…" />;

  return (
    <div className="msg-page">
      <Banner>{error}</Banner>
      <div className="msg-shell">
        <aside className="msg-side">
          <div className="msg-side-head">
            <h2>Messages</h2>
            <p>{sideHint}</p>
            <input
              className="msg-search"
              placeholder="Search name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="msg-filters">
              {filters.map(([role, label]) => (
                <button
                  key={role}
                  type="button"
                  className={`msg-filter${roleFilter === role ? ' on' : ''}`}
                  onClick={() => setRoleFilter(role)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="msg-threads">
            {people.length === 0 && <p className="muted msg-empty">No people to message.</p>}
            {people.map((row) => (
              <button
                key={personId(row.user)}
                type="button"
                className={`msg-thread${personId(row.user) === String(activeId) ? ' on' : ''}`}
                onClick={() => setActiveId(personId(row.user))}
              >
                <span className={`msg-ava role-${row.user.role}`}>{initials(row.user.name)}</span>
                <span className="msg-thread-copy">
                  <strong>{row.user.name}</strong>
                  <b>{row.user.role}</b>
                  <p>{plainText(row.lastMessage)}</p>
                </span>
                <span className="msg-thread-meta">
                  {row.lastAt && <time>{shortTime(row.lastAt)}</time>}
                  {row.unread > 0 && <em>{row.unread}</em>}
                </span>
              </button>
            ))}
          </div>
        </aside>
        <section className="msg-main">
          {!activeId ? (
            <div className="msg-blank">
              <span className="msg-blank-ic">✉</span>
              <h3>Pick someone to message</h3>
              <p className="muted">Choose a teammate or course contact from the list.</p>
            </div>
          ) : (
            <>
              <div className="msg-head">
                <span className={`msg-ava role-${active?.role}`}>{initials(active?.name)}</span>
                <div>
                  <strong>{active?.name || 'Conversation'}</strong>
                  <p>{active?.email} · {active?.role}</p>
                </div>
              </div>
              <div className="msg-thread-view" ref={scroller}>
                {thread.length === 0 && <p className="muted msg-empty">No messages yet. Say hello.</p>}
                {thread.map((m) => (
                  <div key={m.id} className={`msg-row${m.mine ? ' mine' : ''}`}>
                    {!m.mine && <span className={`msg-ava sm role-${m.from?.role}`}>{initials(m.from?.name)}</span>}
                    <div className={`msg-bubble${m.mine ? ' mine' : ''}`}>
                      <p>{plainText(m.body)}</p>
                      <span>{shortTime(m.at)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <form className="msg-compose" onSubmit={send}>
                <input
                  type="text"
                  placeholder={`Message ${active?.name || ''}…`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  required
                />
                <button className="btn" disabled={busy} type="submit">
                  {busy ? '…' : 'Send'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
