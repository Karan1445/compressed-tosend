import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './store';
import { Toaster } from 'sonner';
import Layout from './pages/layout';
import HomePage from './pages/home';
import { LoginForm } from './pages/login';
import { SignupForm } from './pages/register';
import { QuestionPage } from './pages/question';
import DocxPage from './pages/docx/DocxPage';
import './index.css';

// ─── Protected route guard ───────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth);
  const location = useLocation();
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

// ─── Public route guard (redirects logged-in users away from login/register) ─
function PublicRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth);
  if (token && user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// ─── App ─────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<PublicRoute><LoginForm /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><SignupForm /></PublicRoute>} />
      <Route path="/"         element={<ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>} />
      <Route path="/question" element={<ProtectedRoute><Layout><QuestionPage /></Layout></ProtectedRoute>} />
      <Route path="/docx-viewer" element={<ProtectedRoute><Layout><DocxPage /></Layout></ProtectedRoute>} />
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Toaster
        position="top-right"
        richColors
        expand
        toastOptions={{
          duration: 3500,
          style: { fontFamily: 'Inter Variable, sans-serif' },
        }}
      />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  );
}
