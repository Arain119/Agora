import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { api } from '../../lib/api';
import { format } from 'date-fns';
import { Power, PowerOff, Trash2, Plus } from 'lucide-react';
export const Upstreams = () => {
    const [upstreams, setUpstreams] = useState([]);
    const [newKey, setNewKey] = useState('');
    const [newName, setNewName] = useState('');
    const fetchUpstreams = async () => {
        const res = await api.get('/admin/upstreams');
        setUpstreams(res.data);
    };
    useEffect(() => {
        fetchUpstreams();
    }, []);
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newKey || !newName)
            return;
        await api.post('/admin/upstreams', { key: newKey, name: newName });
        setNewKey('');
        setNewName('');
        fetchUpstreams();
    };
    const toggleStatus = async (id, currentStatus) => {
        await api.patch(`/admin/upstreams/${id}`, { isActive: !currentStatus });
        fetchUpstreams();
    };
    const handleDelete = async (id) => {
        if (confirm('Delete this upstream key?')) {
            await api.delete(`/admin/upstreams/${id}`);
            fetchUpstreams();
        }
    };
    return (_jsxs("div", { className: "space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500", children: [_jsx("header", { className: "border-b-4 border-text-primary pb-6 mb-8 flex justify-between items-end", children: _jsxs("div", { children: [_jsx("h1", { className: "text-5xl font-display font-black uppercase tracking-tight text-brand", children: "Upstreams" }), _jsx("p", { className: "text-xl font-bold text-text-secondary mt-2", children: "NVIDIA API Key Management" })] }) }), _jsx("div", { className: "bg-surface border-4 border-text-primary p-6 shadow-solid mb-8", children: _jsxs("form", { onSubmit: handleCreate, className: "flex flex-col md:flex-row gap-4 items-end", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-sm font-bold uppercase mb-2", children: "Display Name" }), _jsx("input", { type: "text", value: newName, onChange: (e) => setNewName(e.target.value), placeholder: "e.g. NVIDIA Key 6", className: "w-full border-2 border-text-primary p-3 bg-bg-primary focus:outline-none focus:ring-4 focus:ring-brand/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" })] }), _jsxs("div", { className: "flex-2 w-full md:w-1/2", children: [_jsx("label", { className: "block text-sm font-bold uppercase mb-2", children: "API Key" }), _jsx("input", { type: "text", value: newKey, onChange: (e) => setNewKey(e.target.value), placeholder: "nvapi-...", className: "w-full border-2 border-text-primary p-3 bg-bg-primary font-mono focus:outline-none focus:ring-4 focus:ring-brand/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" })] }), _jsxs("button", { type: "submit", className: "bg-brand text-white font-bold uppercase px-6 py-3 border-2 border-text-primary hover:bg-text-primary transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2", children: [_jsx(Plus, { size: 20, strokeWidth: 3 }), " Add"] })] }) }), _jsx("div", { className: "grid grid-cols-1 xl:grid-cols-2 gap-6", children: upstreams.map((up) => (_jsxs("div", { className: `border-4 border-text-primary p-6 shadow-solid flex flex-col justify-between transition-colors ${up.isActive ? 'bg-surface' : 'bg-gray-200 text-gray-500'}`, children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-2xl font-display font-bold uppercase", children: up.name }), _jsx("p", { className: "font-mono text-sm mt-2 break-all", children: up.key })] }), _jsx("span", { className: `px-3 py-1 text-xs font-bold uppercase border-2 ${up.isActive ? 'border-green-500 text-green-700 bg-green-100' : 'border-gray-500 text-gray-700 bg-gray-100'}`, children: up.isActive ? 'Active' : 'Disabled' })] }), _jsxs("div", { className: "flex justify-between items-end border-t-2 border-text-primary/20 pt-4 mt-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("p", { className: "text-xs font-bold uppercase", children: ["Errors: ", _jsx("span", { className: up.errorCount > 0 ? 'text-red-500' : '', children: up.errorCount })] }), _jsxs("p", { className: "text-xs font-bold uppercase", children: ["Last Used: ", up.lastUsedAt ? format(new Date(up.lastUsedAt), 'MM/dd HH:mm:ss') : 'Never'] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => toggleStatus(up.id, up.isActive), className: `p-2 border-2 border-text-primary transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${up.isActive ? 'bg-brand-accent hover:bg-yellow-500' : 'bg-green-400 hover:bg-green-500 text-black'}`, title: up.isActive ? "Disable" : "Enable", children: up.isActive ? _jsx(PowerOff, { size: 18 }) : _jsx(Power, { size: 18 }) }), _jsx("button", { onClick: () => handleDelete(up.id), className: "p-2 border-2 border-text-primary bg-red-400 hover:bg-red-500 text-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none", children: _jsx(Trash2, { size: 18 }) })] })] })] }, up.id))) })] }));
};
