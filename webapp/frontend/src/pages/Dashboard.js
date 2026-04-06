import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
export const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ tokenCount: 0, logCount: 0, totalTokensUsed: 0 });
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [tokens, logs] = await Promise.all([
                    api.get('/tokens'),
                    api.get('/logs')
                ]);
                const totalUsed = logs.data.reduce((acc, log) => acc + (log.totalTokens || 0), 0);
                setStats({
                    tokenCount: tokens.data.length,
                    logCount: logs.data.length,
                    totalTokensUsed: totalUsed
                });
            }
            catch (e) {
                console.error("Failed to fetch stats");
            }
        };
        fetchStats();
    }, []);
    return (_jsxs("div", { className: "space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500", children: [_jsx("header", { className: "border-b-4 border-text-primary pb-6 mb-8 flex justify-between items-end", children: _jsxs("div", { children: [_jsx("h1", { className: "text-5xl font-display font-black uppercase tracking-tight", children: "Overview" }), _jsxs("p", { className: "text-xl font-bold text-text-secondary mt-2", children: ["Welcome back, ", user?.username] })] }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("div", { className: "bg-brand-accent border-4 border-text-primary p-6 shadow-solid relative overflow-hidden group", children: [_jsx("div", { className: "absolute -right-8 -top-8 w-32 h-32 bg-white rounded-full mix-blend-overlay opacity-50 group-hover:scale-150 transition-transform duration-700" }), _jsx("h3", { className: "font-bold uppercase text-sm mb-4", children: "Active API Keys" }), _jsx("p", { className: "text-6xl font-display font-black", children: stats.tokenCount })] }), _jsxs("div", { className: "bg-brand text-white border-4 border-text-primary p-6 shadow-solid relative overflow-hidden group", children: [_jsx("div", { className: "absolute -right-8 -top-8 w-32 h-32 bg-black rounded-full mix-blend-overlay opacity-20 group-hover:scale-150 transition-transform duration-700" }), _jsx("h3", { className: "font-bold uppercase text-sm mb-4", children: "Total Requests" }), _jsx("p", { className: "text-6xl font-display font-black", children: stats.logCount })] }), _jsxs("div", { className: "bg-surface border-4 border-text-primary p-6 shadow-solid relative overflow-hidden group", children: [_jsx("div", { className: "absolute -right-8 -top-8 w-32 h-32 bg-brand rounded-full mix-blend-multiply opacity-20 group-hover:scale-150 transition-transform duration-700" }), _jsx("h3", { className: "font-bold uppercase text-sm mb-4", children: "Tokens Consumed" }), _jsx("p", { className: "text-6xl font-display font-black", children: stats.totalTokensUsed.toLocaleString() })] })] }), _jsxs("div", { className: "mt-12 bg-surface border-4 border-text-primary p-8 shadow-solid", children: [_jsx("h2", { className: "text-3xl font-display font-bold uppercase mb-4", children: "Getting Started" }), _jsxs("div", { className: "prose prose-lg text-text-primary", children: [_jsx("p", { className: "font-bold", children: "Base URL for OpenAI-compatible clients:" }), _jsx("pre", { className: "bg-bg-primary border-2 border-text-primary p-4 overflow-x-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]", children: _jsxs("code", { children: [window.location.origin, "/v1"] }) }), _jsx("p", { className: "mt-6 font-bold", children: "Example Usage (cURL):" }), _jsx("pre", { className: "bg-bg-primary border-2 border-text-primary p-4 overflow-x-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]", children: _jsx("code", { children: `curl ${window.location.origin}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-your-token-here" \\
  -d '{
    "model": "meta/llama3-70b-instruct",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'` }) })] })] })] }));
};
