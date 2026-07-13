import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { useEffect, lazy, Suspense } from 'react';
import { store } from './store';
import { Toaster } from 'sonner';
import { refreshMe } from './store/slices/authSlice';
import './index.css';
import Layout from './pages/layout';
const HomePage = lazy(() => import('./pages/home'));
const LoginForm = lazy(() => import('./pages/login').then(module => ({ default: module.LoginForm })));
const SignupForm = lazy(() => import('./pages/register').then(module => ({ default: module.SignupForm })));
const QuestionPage = lazy(() => import('./pages/question').then(module => ({ default: module.QuestionPage })));
const QuestionBuilder = lazy(() => import('./pages/lawyer/QuestionBuilder'));
const QuestionsList = lazy(() => import('./pages/lawyer/QuestionsList'));
const DocxPage = lazy(() => import('./pages/docx/DocxPage'));
const RoleCreation = lazy(() => import('./pages/roles/RoleCreation'));
const RoleAssignment = lazy(() => import('./pages/roles/RoleAssignment'));
const SenderPage = lazy(() => import('./pages/sender/SenderPage'));
const SignerPage = lazy(() => import('./pages/signer/SignerPage'));
const FillDocxPage = lazy(() => import('./pages/signer/FillDocxPage'));
const SubmissionsPage = lazy(() => import('./pages/sender/SubmissionsPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const DocumentList = lazy(() => import('./pages/lawyer/DocumentList'));
const NewDocument = lazy(() => import('./pages/lawyer/NewDocument'));
const DocumentMapper = lazy(() => import('./pages/lawyer/DocumentMapper'));
const PackageList = lazy(() => import('./pages/lawyer/PackageList'));
const PackageStore = lazy(() => import('./pages/lawyer/PackageStore'));
const FillPackage = lazy(() => import('./pages/lawyer/FillPackage'));
const PackageSuccess = lazy(() => import('./pages/lawyer/PackageSuccess'));
const PastSubmissions = lazy(() => import('./pages/lawyer/PastSubmissions'));

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
    }, 100000);
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
      <Route path="/question" element={<PermissionRoute permission="send"><Layout><QuestionPage /></Layout></PermissionRoute>} />

      <Route path="/lawyer/questions" element={<PermissionRoute permission="send"><Layout><QuestionsList /></Layout></PermissionRoute>} />
      <Route path="/lawyer/questions/new" element={<PermissionRoute permission="send"><Layout><QuestionBuilder /></Layout></PermissionRoute>} />
      <Route path="/lawyer/questions/edit/:id" element={<PermissionRoute permission="send"><Layout><QuestionBuilder /></Layout></PermissionRoute>} />
      <Route path="/lawyer/documents" element={<PermissionRoute permission="send"><Layout><DocumentList /></Layout></PermissionRoute>} />
      <Route path="/lawyer/documents/new" element={<PermissionRoute permission="send"><Layout><NewDocument /></Layout></PermissionRoute>} />
      <Route path="/lawyer/documents/:id/map" element={<PermissionRoute permission="send"><Layout><DocumentMapper /></Layout></PermissionRoute>} />
      <Route path="/lawyer/packages" element={<PermissionRoute permission="send"><Layout><PackageList /></Layout></PermissionRoute>} />

      <Route path="/lawyer/packages/store" element={<PermissionRoute permission="send"><Layout><PackageStore /></Layout></PermissionRoute>} />
      <Route path="/lawyer/packages/store/:id/fill" element={<PermissionRoute permission="send"><Layout><FillPackage /></Layout></PermissionRoute>} />
      <Route path="/lawyer/packages/store/success/:submissionId" element={<PermissionRoute permission="send"><Layout><PackageSuccess /></Layout></PermissionRoute>} />
      <Route path="/lawyer/packages/past-submissions" element={<PermissionRoute permission="send"><Layout><PastSubmissions /></Layout></PermissionRoute>} />

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
