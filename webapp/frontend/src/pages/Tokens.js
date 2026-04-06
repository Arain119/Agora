import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { api } from '../lib/api';
import { format } from 'date-fns';
import { Copy, Plus, Trash2 } from 'lucide-react';
export const Tokens = () => {
    const [tokens, setTokens] = useState([]);
    const [name, setName] = useState('');
    const fetchTokens = async () => {
        const res = await api.get('/tokens');
        setTokens(res.data);
    };
    useEffect(() => {
        fetchTokens();
    }, []);
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name)
            return;
        await api.post('/tokens', { name });
        setName('');
        fetchTokens();
    };
    const handleDelete = async (id) => {
        if (confirm('Are you sure?')) {
            await api.delete(`/tokens/${id}`);
            fetchTokens();
        }
    };
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard');
    };
    return (_jsxs("div", { className: "space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500", children: [_jsx("header", { className: "border-b-4 border-text-primary pb-6 mb-8", children: _jsx("h1", { className: "text-5xl font-display font-black uppercase tracking-tight", children: "API Tokens" }) }), _jsx("div", { className: "bg-surface border-4 border-text-primary p-6 shadow-solid mb-8", children: _jsxs("form", { onSubmit: handleCreate, className: "flex gap-4 items-end", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-sm font-bold uppercase mb-2", children: "New Token Name" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g. Production App", className: "w-full border-2 border-text-primary p-3 bg-bg-primary focus:outline-none focus:ring-4 focus:ring-brand/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" })] }), _jsxs("button", { type: "submit", className: "bg-brand text-white font-bold uppercase px-6 py-3 border-2 border-text-primary hover:bg-text-primary transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2", children: [_jsx(Plus, { size: 20, strokeWidth: 3 }), " Create"] })] }) }), _jsxs("div", { className: "grid gap-6", children: [tokens.map((token) => (_jsxs("div", { className: "bg-surface border-4 border-text-primary p-6 shadow-solid flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:-translate-y-1 transition-transform", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-2xl font-display font-bold uppercase", children: token.name }), _jsxs("p", { className: "font-mono text-sm bg-bg-primary p-2 border-2 border-text-primary mt-2 flex items-center gap-2", children: [token.token.substring(0, 15), "...", token.token.substring(token.token.length - 4), _jsx("button", { onClick: () => copyToClipboard(token.token), className: "hover:text-brand transition-colors", children: _jsx(Copy, { size: 16 }) })] })] }), _jsxs("div", { className: "flex items-center gap-6", children: [_jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs font-bold uppercase text-text-secondary", children: "Created" }), _jsx("p", { className: "font-bold", children: format(new Date(token.createdAt), 'MMM dd, yyyy') })] }), _jsx("button", { onClick: () => handleDelete(token.id), className: "p-3 bg-red-100 text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]", children: _jsx(Trash2, { size: 20, strokeWidth: 2.5 }) })] })] }, token.id))), tokens.length === 0 && (_jsx("div", { className: "p-12 text-center border-4 border-dashed border-text-secondary", children: _jsx("p", { className: "text-xl font-bold uppercase text-text-secondary", children: "No tokens generated yet." }) }))] })] }));
};
