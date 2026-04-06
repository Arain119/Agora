import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
const AuthContext = createContext({
    user: null,
    loading: true,
    login: () => { },
    logout: () => { }
});
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('agora_token');
            if (token) {
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                }
                catch (e) {
                    localStorage.removeItem('agora_token');
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);
    const login = (token, user) => {
        localStorage.setItem('agora_token', token);
        setUser(user);
    };
    const logout = () => {
        localStorage.removeItem('agora_token');
        setUser(null);
    };
    return (_jsx(AuthContext.Provider, { value: { user, loading, login, logout }, children: children }));
};
export const useAuth = () => useContext(AuthContext);
