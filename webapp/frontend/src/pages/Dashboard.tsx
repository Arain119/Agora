import { useState, useEffect } from "react";
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

        const totalUsed = logs.data.reduce((acc: number, log: any) => acc + (log.totalTokens || 0), 0);

        setStats({
          tokenCount: tokens.data.length,
          logCount: logs.data.length,
          totalTokensUsed: totalUsed
        });
      } catch (e) {
        console.error("Failed to fetch stats");
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b-4 border-text-primary pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight">Overview</h1>
          <p className="text-lg md:text-xl font-bold text-text-secondary mt-2">Welcome back, {user?.username}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="bg-brand-accent rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white rounded-full mix-blend-overlay opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out"></div>
          <h3 className="font-bold uppercase text-sm md:text-base mb-4 bg-white/40 inline-block px-3 py-1 rounded-full border-2 border-text-primary">Active API Keys</h3>
          <p className="text-5xl md:text-6xl font-display font-black relative z-10">{stats.tokenCount}</p>
        </div>

        <div className="bg-brand text-white rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-black rounded-full mix-blend-overlay opacity-20 group-hover:scale-150 transition-transform duration-700 ease-out"></div>
          <h3 className="font-bold uppercase text-sm md:text-base mb-4 bg-black/20 inline-block px-3 py-1 rounded-full border-2 border-white">Total Requests</h3>
          <p className="text-5xl md:text-6xl font-display font-black relative z-10">{stats.logCount}</p>
        </div>

        <div className="bg-surface rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand rounded-full mix-blend-multiply opacity-20 group-hover:scale-150 transition-transform duration-700 ease-out"></div>
          <h3 className="font-bold uppercase text-sm md:text-base mb-4 bg-bg-secondary inline-block px-3 py-1 rounded-full border-2 border-text-primary">Tokens Consumed</h3>
          <p className="text-5xl md:text-6xl font-display font-black relative z-10 truncate" title={stats.totalTokensUsed.toLocaleString()}>{stats.totalTokensUsed.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-12 bg-surface rounded-geometric-lg border-4 border-text-primary p-6 md:p-10 shadow-solid">
        <h2 className="text-2xl md:text-3xl font-display font-bold uppercase mb-6 flex items-center gap-3">
          <span className="w-4 h-4 bg-brand rounded-full inline-block border-2 border-text-primary"></span>
          Getting Started
        </h2>
        <div className="prose prose-sm md:prose-lg max-w-none text-text-primary">
          <p className="font-bold mb-2 pl-2">Base URL for OpenAI-compatible clients:</p>
          <pre className="bg-bg-primary rounded-geometric border-2 border-text-primary p-4 md:p-6 overflow-x-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <code className="text-sm md:text-base">{window.location.origin}/v1</code>
          </pre>
          <p className="mt-8 mb-2 font-bold pl-2">Example Usage (cURL):</p>
          <pre className="bg-text-primary text-white rounded-geometric border-2 border-text-primary p-4 md:p-6 overflow-x-auto shadow-[4px_4px_0px_0px_rgba(255,212,94,1)]">
            <code className="text-sm md:text-base">
{`curl ${window.location.origin}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-your-token-here" \\
  -d '{
    "model": "meta/llama3-70b-instruct",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};
