import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { api } from '../../lib/api';
import { format } from 'date-fns';
export const Users = () => {
    const [users, setUsers] = useState([]);
    useEffect(() => {
        const fetchUsers = async () => {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        };
        fetchUsers();
    }, []);
    return (_jsxs("div", { className: "space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500", children: [_jsx("header", { className: "border-b-4 border-text-primary pb-6 mb-8", children: _jsx("h1", { className: "text-5xl font-display font-black uppercase tracking-tight text-brand", children: "Users" }) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6", children: users.map((u) => (_jsxs("div", { className: "bg-surface border-4 border-text-primary p-6 shadow-solid relative", children: [_jsx("h3", { className: "text-2xl font-display font-bold uppercase", children: u.username }), _jsx("p", { className: "font-mono text-xs text-text-secondary mt-1", children: u.id }), _jsxs("div", { className: "mt-6 pt-4 border-t-2 border-text-primary/20 flex justify-between items-center", children: [_jsx("span", { className: `px-2 py-1 text-xs font-bold uppercase border-2 ${u.role === 'ADMIN' ? 'bg-brand text-white border-brand' : 'bg-gray-200 text-gray-700 border-gray-400'}`, children: u.role }), _jsx("span", { className: "text-xs font-bold uppercase text-text-secondary", children: format(new Date(u.createdAt), 'MMM dd, yyyy') })] })] }, u.id))) })] }));
};
