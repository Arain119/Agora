import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { api } from '../lib/api';
export const Models = () => {
    const [models, setModels] = useState([]);
    useEffect(() => {
        const fetchModels = async () => {
            const res = await api.get('/models');
            setModels(res.data.data);
        };
        fetchModels();
    }, []);
    return (_jsxs("div", { className: "space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500", children: [_jsxs("header", { className: "border-b-4 border-text-primary pb-6 mb-8", children: [_jsx("h1", { className: "text-5xl font-display font-black uppercase tracking-tight", children: "Available Models" }), _jsx("p", { className: "text-xl font-bold text-text-secondary mt-2", children: "NVIDIA API Gateway Support" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: models.map((model) => (_jsxs("div", { className: "bg-surface border-4 border-text-primary p-6 shadow-solid relative overflow-hidden group hover:bg-brand hover:text-white transition-colors duration-300", children: [_jsx("div", { className: "absolute -right-8 -bottom-8 w-32 h-32 border-8 border-brand-accent rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700 pointer-events-none" }), _jsx("span", { className: "inline-block px-3 py-1 bg-text-primary text-white text-xs font-bold uppercase tracking-widest mb-4 group-hover:bg-white group-hover:text-text-primary", children: model.owned_by }), _jsx("h3", { className: "text-2xl font-display font-bold mb-4 break-words leading-tight", children: model.id }), _jsx("div", { className: "mt-8 pt-4 border-t-4 border-text-primary group-hover:border-white/30 flex justify-between", children: _jsxs("span", { className: "text-xs font-bold uppercase", children: ["Object: ", model.object] }) })] }, model.id))) })] }));
};
