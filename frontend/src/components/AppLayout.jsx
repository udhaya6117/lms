import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const ICONS = {
  dashboard: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  courses: 'M4 5h16v2H4V5zm0 4h16v10H4V9zm2 2v6h12v-6H6z',
  learn: 'M12 3L2 8l10 5 8-4.1V15h2V8L12 3zm-6 9.2V16c0 2.2 2.7 4 6 4s6-1.8 6-4v-3.8l-6 3-6-3z',
  assignments: 'M7 3h10v2H7V3zm-2 4h14v14H5V7zm2 3h10v2H7v-2zm0 4h7v2H7v-2z',
  submissions: 'M6 2h9l5 5v15H6V2zm9 1.5V8h4.5L15 3.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2z',
  certificates: 'M12 2l2.2 4.6L19 7.2l-3.4 3.3.8 4.7L12 13.4 7.6 15.2l.8-4.7L5 7.2l4.8-.6L12 2z',
  bell: 'M12 22a2.2 2.2 0 0 0 2.2-2H9.8A2.2 2.2 0 0 0 12 22zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2z',
  teach: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z',
  users: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z',
  students: 'M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z',
  categories: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 3h7v4h-7v-4z',
  approvals: 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
  payments: 'M3 6h18v12H3V6zm2 4h14v2H5v-2z',
  chat: 'M4 4h16v10H7l-3 3V4zm3 3h10v2H7V7zm0 3h7v2H7v-2z',
};

function Icon({ name }) {
  return (
    <svg className="nav-ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name] || ICONS.dashboard} />
    </svg>
  );
}

function Item({ to, icon, children, count = 0 }) {
  return (
    <NavLink to={to}>
      <Icon name={icon} />
      <span>{children}</span>
      {count > 0 && <em className="nav-count">{count > 99 ? '99+' : count}</em>}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState({ messages: 0, notifications: 0 });

  useEffect(() => {
    let live = true;
    const load = () =>
      api('/api/inbox/unread')
        .then((res) => {
          if (live) setUnread(res.data || { messages: 0, notifications: 0 });
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 12000);
    window.addEventListener('lms-inbox-refresh', load);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener('lms-inbox-refresh', load);
    };
  }, [user, location.pathname]);
  const first = user?.name?.split(' ')[0] || 'there';
  const initials = (user?.name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="layout" data-role={user?.role}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>
          <div>
            ACADEMIA <span>LMS</span>
            <small>Course & assignment workspace</small>
          </div>
        </div>
        <nav className="nav">
          <Item to="/dashboard" icon="dashboard">Dashboard</Item>
          {user?.role === 'student' && (
            <>
              <Item to="/courses" icon="courses">Available courses</Item>
              <Item to="/my-courses" icon="learn">My courses</Item>
              <Item to="/assignments" icon="assignments">Assignments</Item>
              <Item to="/submissions" icon="submissions">My submissions</Item>
              <Item to="/certificates" icon="certificates">Certificates</Item>
              <Item to="/messages" icon="chat" count={unread.messages}>Messages</Item>
              <Item to="/notifications" icon="bell" count={unread.notifications}>Notifications</Item>
            </>
          )}
          {user?.role === 'trainer' && (
            <>
              <Item to="/trainer" icon="teach">Teach</Item>
              <Item to="/courses" icon="learn">My courses</Item>
              <Item to="/messages" icon="chat" count={unread.messages}>Messages</Item>
              <Item to="/notifications" icon="bell" count={unread.notifications}>Notifications</Item>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <Item to="/admin/trainers" icon="users">Trainers</Item>
              <Item to="/admin/students" icon="students">Students</Item>
              <Item to="/admin/categories" icon="categories">Categories</Item>
              <Item to="/admin/approvals" icon="approvals">Approvals</Item>
              <Item to="/admin/payments" icon="payments">Payments</Item>
              <Item to="/courses" icon="courses">All courses</Item>
              <Item to="/messages" icon="chat" count={unread.messages}>Messages</Item>
              <Item to="/notifications" icon="bell" count={unread.notifications}>Notifications</Item>
            </>
          )}
        </nav>
        <div className="user-card">
          <strong>Signed in</strong>
          <p>{user?.name}</p>
          <p className="muted">{user?.email}</p>
          <span className="role">{user?.role}</span>
          <button className="btn sidebar-out" type="button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <h1 className="welcome">Welcome back {first}</h1>
          <div className="top-tools">
            <button className="top-search" type="button" onClick={() => navigate('/courses')}>
              Search courses
            </button>
            <div className="avatar" title={user?.name}>{initials}</div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
