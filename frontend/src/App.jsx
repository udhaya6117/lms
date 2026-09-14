import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import MyCoursesPage from './pages/MyCoursesPage';
import AssignmentsPage from './pages/AssignmentsPage';
import SubmissionsPage from './pages/SubmissionsPage';
import TrainerDashboardPage from './pages/TrainerDashboardPage';
import AssignmentSubmissionsPage from './pages/AssignmentSubmissionsPage';
import AdminDirectoryPage from './pages/AdminDirectoryPage';
import AdminCreateUserPage from './pages/AdminCreateUserPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminApprovalsPage from './pages/AdminApprovalsPage';
import AdminPaymentsPage from './pages/AdminPaymentsPage';
import LearnPage from './pages/LearnPage';
import QuizTakePage from './pages/QuizTakePage';
import CertificatesPage from './pages/CertificatesPage';
import CheckoutPage from './pages/CheckoutPage';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetailPage />} />
            <Route
              path="/courses/:id/learn"
              element={
                <ProtectedRoute roles={['student']}>
                  <LearnPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:id/quiz"
              element={
                <ProtectedRoute roles={['student']}>
                  <QuizTakePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:id/checkout"
              element={
                <ProtectedRoute roles={['student']}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/certificates"
              element={
                <ProtectedRoute roles={['student']}>
                  <CertificatesPage />
                </ProtectedRoute>
              }
            />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route
              path="/my-courses"
              element={
                <ProtectedRoute roles={['student']}>
                  <MyCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assignments"
              element={
                <ProtectedRoute roles={['student']}>
                  <AssignmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submissions"
              element={
                <ProtectedRoute roles={['student']}>
                  <SubmissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer"
              element={
                <ProtectedRoute roles={['trainer']}>
                  <TrainerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assignments/:assignmentId/submissions"
              element={
                <ProtectedRoute roles={['trainer', 'admin']}>
                  <AssignmentSubmissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/trainers/new"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminCreateUserPage role="trainer" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/new"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminCreateUserPage role="student" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/trainers/:id/edit"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminCreateUserPage role="trainer" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/:id/edit"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminCreateUserPage role="student" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/trainers"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDirectoryPage role="trainer" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDirectoryPage role="student" />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/users" element={<Navigate to="/admin/trainers" replace />} />
            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminCategoriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/approvals"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminApprovalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminPaymentsPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
