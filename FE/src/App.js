import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { store } from './store';
import { Toaster } from 'sonner';
import Layout from './pages/layout';
import HomePage from './pages/home';
import { LoginForm } from './pages/login';
import { SignupForm } from './pages/register';
import QuestionBuilder from './pages/lawyer/QuestionBuilder';
import QuestionsList from './pages/lawyer/QuestionsList';
import DocxPage from './pages/docx/DocxPage';
import RoleCreation from './pages/roles/RoleCreation';
import RoleAssignment from './pages/roles/RoleAssignment';
import SenderPage from './pages/sender/SenderPage';
import SignerPage from './pages/signer/SignerPage';
import FillDocxPage from './pages/signer/FillDocxPage';
import SubmissionsPage from './pages/sender/SubmissionsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Unauthorized from './pages/Unauthorized';
import { refreshMe } from './store/slices/authSlice';
import './index.css';

function getHomePath(user) {
  if (!user) return '/login';
  const perms = user.permissions || [];
  const isSuper = user.role === 'Super Admin';
  if (isSuper) return '/';
  if (perms.includes('assign_role') || perms.includes('create_role')) return '/';
  if (perms.includes('send')) return '/sender';
  if (perms.includes('sign')) return '/signer';
  return '/unauthorized';
}

function PermissionRoute({ permission, children }) {
  const { token, user } = useSelector((state) => state.auth);
  const location = useLocation();
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (user.role === 'Super Admin') return children;
  const perms = user.permissions || [];

  const hasAccess = Array.isArray(permission)
    ? permission.some(p => perms.includes(p))
    : perms.includes(permission);

  if (!hasAccess) {
    return <Navigate to={getHomePath(user)} replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth);
  if (token && user) {
    return <Navigate to={getHomePath(user)} replace />;
  }
  return children;
}

function RoleSyncProvider({ children }) {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!token) return;
    dispatch(refreshMe());
    const interval = setInterval(() => {
      dispatch(refreshMe());
    }, 30000);
    return () => clearInterval(interval);
  }, [token, dispatch]);

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginForm /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><SignupForm /></PublicRoute>} />
      <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/" element={<PermissionRoute permission={['assign_role', 'create_role']}><Layout><HomePage /></Layout></PermissionRoute>} />
      <Route path="/roles/create" element={<PermissionRoute permission="create_role"><Layout><RoleCreation /></Layout></PermissionRoute>} />
      <Route path="/roles/assign" element={<PermissionRoute permission="assign_role"><Layout><RoleAssignment /></Layout></PermissionRoute>} />

      <Route path="/lawyer/questions" element={<PermissionRoute permission="send"><Layout><QuestionsList /></Layout></PermissionRoute>} />
      <Route path="/lawyer/questions/new" element={<PermissionRoute permission="send"><Layout><QuestionBuilder /></Layout></PermissionRoute>} />
      <Route path="/lawyer/questions/edit/:id" element={<PermissionRoute permission="send"><Layout><QuestionBuilder /></Layout></PermissionRoute>} />
      <Route path="/sender" element={<PermissionRoute permission="send"><Layout><SenderPage /></Layout></PermissionRoute>} />
      <Route path="/docx-viewer" element={<PermissionRoute permission="send"><Layout><DocxPage /></Layout></PermissionRoute>} />
      <Route path="/submissions" element={<PermissionRoute permission="send"><Layout><SubmissionsPage /></Layout></PermissionRoute>} />

      <Route path="/signer" element={<PermissionRoute permission="sign"><Layout><SignerPage /></Layout></PermissionRoute>} />
      <Route path="/signer/fill/:docxId" element={<PermissionRoute permission="sign"><Layout><FillDocxPage /></Layout></PermissionRoute>} />

      <Route path="*" element={<SmartRedirect />} />
    </Routes>
  );
}

function SmartRedirect() {
  const { user } = useSelector((state) => state.auth);
  return <Navigate to={getHomePath(user)} replace />;
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
        <RoleSyncProvider>
          <AppRoutes />
        </RoleSyncProvider>
      </BrowserRouter>
    </Provider>
  );
}
