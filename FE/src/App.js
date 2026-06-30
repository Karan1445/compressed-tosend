import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { store } from './store';
import { Toaster } from 'sonner';
import Layout from './pages/layout';
import HomePage from './pages/home';
import { LoginForm } from './pages/login';
import { SignupForm } from './pages/register';
import { QuestionPage } from './pages/question';
import DocxPage from './pages/docx/DocxPage';
import RoleCreation from './pages/roles/RoleCreation';
import RoleAssignment from './pages/roles/RoleAssignment';
import SenderPage from './pages/sender/SenderPage';
import SignerPage from './pages/signer/SignerPage';
import Unauthorized from './pages/Unauthorized';
import { refreshMe } from './store/slices/authSlice';
import './index.css';

// ─── Helper: compute first landing page based on permissions ─────────────────
function getHomePath(user) {
  if (!user) return '/login';
  const perms = user.permissions || [];
  const isSuper = user.role === 'Super Admin';
  // Super Admin always goes to user list
  if (isSuper) return '/';
  // Otherwise go to first permitted page
  if (perms.includes('assign_role') || perms.includes('create_role')) return '/';
  if (perms.includes('send')) return '/sender';
  if (perms.includes('sign')) return '/signer';
  return '/unauthorized';
}

// ─── Permission-based route guard ────────────────────────────────────────────
function PermissionRoute({ permission, children }) {
  const { token, user } = useSelector((state) => state.auth);
  const location = useLocation();
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  // Super Admin bypasses all permission checks
  if (user.role === 'Super Admin') return children;
  const perms = user.permissions || [];
  
  const hasAccess = Array.isArray(permission) 
    ? permission.some(p => perms.includes(p)) 
    : perms.includes(permission);

  if (!hasAccess) {
    // Redirect to their own home page silently instead of showing an error
    return <Navigate to={getHomePath(user)} replace />;
  }
  return children;
}

// ─── Public route guard (redirect logged-in users to their home) ─────────────
function PublicRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth);
  if (token && user) {
    return <Navigate to={getHomePath(user)} replace />;
  }
  return children;
}

// ─── Live role sync: polls /me every 30s while logged in ─────────────────────
function RoleSyncProvider({ children }) {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!token) return;
    // Immediate refresh on mount / login
    dispatch(refreshMe());
    // Then poll every 30 seconds
    const interval = setInterval(() => {
      dispatch(refreshMe());
    }, 30000);
    return () => clearInterval(interval);
  }, [token, dispatch]);

  return children;
}

// ─── App ────────────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><LoginForm /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><SignupForm /></PublicRoute>} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Super Admin / Admin roles */}
      <Route path="/"         element={<PermissionRoute permission={['assign_role', 'create_role']}><Layout><HomePage /></Layout></PermissionRoute>} />
      <Route path="/roles/create" element={<PermissionRoute permission="create_role"><Layout><RoleCreation /></Layout></PermissionRoute>} />
      <Route path="/roles/assign" element={<PermissionRoute permission="assign_role"><Layout><RoleAssignment /></Layout></PermissionRoute>} />

      {/* Sender specific */}
      <Route path="/question" element={<PermissionRoute permission="send"><Layout><QuestionPage /></Layout></PermissionRoute>} />
      <Route path="/sender"      element={<PermissionRoute permission="send"><Layout><SenderPage /></Layout></PermissionRoute>} />
      <Route path="/docx-viewer" element={<PermissionRoute permission="send"><Layout><DocxPage /></Layout></PermissionRoute>} />

      {/* Signer specific */}
      <Route path="/signer" element={<PermissionRoute permission="sign"><Layout><SignerPage /></Layout></PermissionRoute>} />

      {/* Catch-all — smart redirect */}
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
