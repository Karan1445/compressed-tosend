import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from "sonner";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(sessionStorage.getItem("token"));
    const [user, setUser] = useState(sessionStorage.getItem("user"));
    const location = useLocation();
    const navigator = useNavigate();
    const ref = useRef(false);

    useEffect(() => {
        if (ref.current) return;
        ref.current = true;
        if (location.pathname != "/login" && location.pathname != "/register") {
            if (token == null || user == null) {
                toast.warning("Login required!")
                navigator("/login", { replace: true })
            }
        }
    }, [])

    return (
        <AuthContext.Provider>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
