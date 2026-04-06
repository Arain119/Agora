import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Key, BarChart3, Database, Users, Box, Cpu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
export const Layout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    const navItems = [
        { name: 'Dashboard', path: '/', icon: BarChart3 },
        { name: 'API Tokens', path: '/tokens', icon: Key },
        { name: 'Models', path: '/models', icon: Box },
        { name: 'Request Logs', path: '/logs', icon: Database },
    ];
    if (user.role === 'ADMIN') {
        navItems.push({ name: 'Upstreams (NVIDIA)', path: '/admin/upstreams', icon: Cpu }, { name: 'Users', path: '/admin/users', icon: Users }, { name: 'Global Logs', path: '/admin/logs', icon: Database });
    }
    return (_jsxs("div", { className: "min-h-screen bg-bg-primary flex flex-col md:flex-row text-text-primary", children: [_jsxs("aside", { className: "w-full md:w-64 bg-brand-dark text-white md:min-h-screen flex flex-col shadow-solid border-r-4 border-text-primary z-10 relative", children: [_jsxs("div", { className: "p-6 border-b-4 border-text-primary bg-brand", children: [_jsx("h1", { className: "text-3xl font-display font-bold uppercase tracking-tighter mix-blend-screen text-bg-primary", children: "Agora" }), _jsx("p", { className: "text-xs font-sans uppercase font-bold tracking-widest mt-1 text-text-primary", children: "NVIDIA Gateway" })] }), _jsx("nav", { className: "flex-1 p-4 space-y-2", children: navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon;
                            return (_jsxs(Link, { to: item.path, className: `flex items-center space-x-3 px-4 py-3 border-2 transition-all duration-200 font-sans font-bold uppercase text-sm ${isActive
                                    ? 'bg-brand-accent text-text-primary border-text-primary shadow-solid translate-x-[-2px] translate-y-[-2px]'
                                    : 'bg-transparent border-transparent text-gray-300 hover:border-gray-500 hover:bg-white/5'}`, children: [_jsx(Icon, { size: 18, strokeWidth: 2.5 }), _jsx("span", { children: item.name })] }, item.path));
                        }) }), _jsx("div", { className: "p-4 border-t-4 border-text-primary bg-white text-text-primary", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "truncate pr-2", children: [_jsx("p", { className: "text-sm font-bold uppercase truncate", children: user.username }), _jsx("p", { className: "text-xs text-text-secondary uppercase", children: user.role })] }), _jsx("button", { onClick: logout, className: "p-2 border-2 border-text-primary hover:bg-brand hover:text-white transition-colors duration-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]", children: _jsx(LogOut, { size: 16, strokeWidth: 2.5 }) })] }) })] }), _jsxs("main", { className: "flex-1 p-4 md:p-8 overflow-y-auto w-full relative", children: [_jsx("div", { className: "fixed top-0 right-0 w-64 h-64 bg-brand-accent rounded-full blur-3xl opacity-20 pointer-events-none mix-blend-multiply" }), _jsx("div", { className: "fixed bottom-0 left-64 w-96 h-96 bg-brand rounded-full blur-3xl opacity-10 pointer-events-none mix-blend-multiply" }), _jsx("div", { className: "max-w-6xl mx-auto relative z-10", children: _jsx(Outlet, {}) })] })] }));
};
