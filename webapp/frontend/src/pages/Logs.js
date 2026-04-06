import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { api } from '../lib/api';
import { format } from 'date-fns';
export const Logs = () => {
    const [logs, setLogs] = useState([]);
    useEffect(() => {
        const fetchLogs = async () => {
            const res = await api.get('/logs');
            setLogs(res.data);
        };
        fetchLogs();
    }, []);
    return (_jsxs("div", { className: "space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500", children: [_jsx("header", { className: "border-b-4 border-text-primary pb-6 mb-8", children: _jsx("h1", { className: "text-5xl font-display font-black uppercase tracking-tight", children: "Request Logs" }) }), _jsx("div", { className: "bg-surface border-4 border-text-primary shadow-solid overflow-x-auto", children: _jsxs("table", { className: "w-full text-left border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-bg-primary border-b-4 border-text-primary", children: [_jsx("th", { className: "p-4 font-display font-bold uppercase", children: "Time" }), _jsx("th", { className: "p-4 font-display font-bold uppercase", children: "Model" }), _jsx("th", { className: "p-4 font-display font-bold uppercase", children: "Tokens (P/C/T)" }), _jsx("th", { className: "p-4 font-display font-bold uppercase", children: "Duration" }), _jsx("th", { className: "p-4 font-display font-bold uppercase", children: "Status" })] }) }), _jsxs("tbody", { children: [logs.map((log) => (_jsxs("tr", { className: "border-b-2 border-text-primary/20 hover:bg-brand-accent/20 transition-colors", children: [_jsx("td", { className: "p-4 font-mono text-sm whitespace-nowrap", children: format(new Date(log.createdAt), 'MM/dd HH:mm:ss') }), _jsx("td", { className: "p-4 font-bold", children: log.model }), _jsxs("td", { className: "p-4 font-mono", children: [log.promptTokens, " / ", log.completionTokens, " / ", log.totalTokens] }), _jsxs("td", { className: "p-4 font-mono", children: [log.durationMs, "ms"] }), _jsx("td", { className: "p-4", children: _jsx("span", { className: `px-2 py-1 text-xs font-bold uppercase border-2 ${log.status === 200 ? 'border-green-500 text-green-700 bg-green-100' : 'border-red-500 text-red-700 bg-red-100'}`, children: log.status }) })] }, log.id))), logs.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "p-8 text-center font-bold uppercase text-text-secondary", children: "No requests logged yet." }) }))] })] }) })] }));
};
