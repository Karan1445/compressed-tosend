import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { toast } from 'sonner';

export default function Unauthorized() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  function handleLogout() {
    dispatch(logout());
    toast.success('Logged out. Please log in again.');
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-gray-50 p-6 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
        <ShieldOff className="h-8 w-8 text-red-500" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="text-gray-500 text-sm">
          You do not have permission to view this page. Please contact your administrator if you believe this is a mistake.
        </p>
        {user && (
          <p className="text-xs text-gray-400 mt-1">
            Logged in as <span className="font-semibold">{user.email}</span> — Role: <span className="font-semibold">{user.role || 'None'}</span>
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="border-gray-300" onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleLogout}>
          Log Out & Switch Account
        </Button>
      </div>
    </div>
  );
}
