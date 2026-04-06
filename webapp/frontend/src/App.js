import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Tokens } from './pages/Tokens';
import { Models } from './pages/Models';
import { Logs } from './pages/Logs';
import { Upstreams } from './pages/admin/Upstreams';
import { AdminLogs } from './pages/admin/AdminLogs';
import { Users } from './pages/admin/Users';
function App() {
    return (_jsx(AuthProvider, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsxs(Route, { path: "/", element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "tokens", element: _jsx(Tokens, {}) }), _jsx(Route, { path: "models", element: _jsx(Models, {}) }), _jsx(Route, { path: "logs", element: _jsx(Logs, {}) }), _jsx(Route, { path: "admin/upstreams", element: _jsx(Upstreams, {}) }), _jsx(Route, { path: "admin/logs", element: _jsx(AdminLogs, {}) }), _jsx(Route, { path: "admin/users", element: _jsx(Users, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }));
}
export default App;
