import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
export const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/login', { username, password });
            login(res.data.token, res.data.user);
        }
        catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden", children: [_jsx("div", { className: "absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-brand rounded-full mix-blend-multiply filter blur-xl opacity-80 animate-pulse", style: { animationDuration: '8s' } }), _jsx("div", { className: "absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] bg-brand-accent mix-blend-multiply filter blur-xl opacity-80" }), _jsxs("div", { className: "w-full max-w-md bg-surface border-4 border-text-primary p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative z-10", children: [_jsx("h1", { className: "text-6xl font-display font-black uppercase tracking-tighter mb-2 text-text-primary", children: "Agora" }), _jsx("p", { className: "text-xl font-bold uppercase mb-8 text-brand", children: "NVIDIA Gateway" }), error && (_jsx("div", { className: "bg-red-100 border-2 border-red-500 text-red-700 p-3 mb-6 font-bold uppercase text-sm", children: error })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold uppercase mb-2", children: "Username" }), _jsx("input", { type: "text", value: username, onChange: (e) => setUsername(e.target.value), className: "w-full border-2 border-text-primary p-3 bg-bg-primary font-sans focus:outline-none focus:ring-4 focus:ring-brand-accent/50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold uppercase mb-2", children: "Password" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full border-2 border-text-primary p-3 bg-bg-primary font-sans focus:outline-none focus:ring-4 focus:ring-brand-accent/50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]", required: true })] }), _jsx("button", { type: "submit", className: "w-full bg-text-primary text-white font-bold uppercase py-4 border-2 border-text-primary hover:bg-brand hover:text-text-primary transition-all shadow-[6px_6px_0px_0px_rgba(255,212,94,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(255,212,94,1)]", children: "Enter System" })] })] })] }));
};
