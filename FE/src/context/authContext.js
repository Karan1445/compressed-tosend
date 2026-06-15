import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const location = useLocation();
  const navigator = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onStorage = () => setTick((value) => value + 1);
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const token = sessionStorage.getItem('token');
  const user = sessionStorage.getItem('user');

  useEffect(() => {
    if (location.pathname === '/login' || location.pathname === '/register') return;
    if (!token || !user) {
      toast.warning('Login required!');
      navigator('/login', { replace: true });
    }
  }, [location.pathname, navigator, token, user, tick]);

  const value = useMemo(
    () => ({
      token,
      user,
      refreshAuth: () => setTick((value) => value + 1),
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
