import { useState, useEffect } from "react";
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card } from "../components/ui/Card";

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ tokenCount: 0, logCount: 0, totalTokensUsed: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tokens, logs, analytics] = await Promise.all([
          api.get('/tokens'),
          api.get('/logs'),
          api.get('/analytics').catch(() => ({ data: [] }))
        ]);

        const totalUsed = logs.data.reduce((acc: number, log: any) => acc + (log.totalTokens || 0), 0);

        setStats({
          tokenCount: tokens.data.length,
          logCount: logs.data.length,
          totalTokensUsed: totalUsed
        });

        if (analytics.data && analytics.data.length > 0) {
            setChartData(analytics.data);
        } else {
             // Fallback to logs if analytics endpoint fails
             const days = Array.from({length: 7}, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const groupedData = days.map(day => {
                const dayLogs = logs.data.filter((l: any) => l.timestamp.startsWith(day));
                return {
                    date: day,
                    requests: dayLogs.length,
                    latency: dayLogs.reduce((acc: number, l: any) => acc + (l.durationMs || 0), 0) / (dayLogs.length || 1),
                    tokens: dayLogs.reduce((acc: number, l: any) => acc + (l.totalTokens || 0), 0)
                };
            });
            setChartData(groupedData);
        }

      } catch (e) {
        console.error("Failed to fetch stats", e);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6 md:p-8" variant="accent">
            <h3 className="text-xl font-display font-bold uppercase mb-6 flex items-center gap-2">
                <span className="w-3 h-3 bg-text-primary rounded-full"></span>
                Request Trends (7 Days)
            </h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" opacity={0.2} vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(val) => val.split('-').slice(1).join('/')} stroke="#1A1A1A" axisLine={{ strokeWidth: 2 }} tickLine={{ strokeWidth: 2 }} />
                        <YAxis stroke="#1A1A1A" axisLine={{ strokeWidth: 2 }} tickLine={{ strokeWidth: 2 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#FFD45E', border: '3px solid #1A1A1A', borderRadius: '0', boxShadow: '4px 4px 0px 0px #1A1A1A', fontWeight: 'bold' }}
                            itemStyle={{ color: '#1A1A1A' }}
                        />
                        <Bar dataKey="requests" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 md:p-8">
            <h3 className="text-xl font-display font-bold uppercase mb-6 flex items-center gap-2">
                <span className="w-3 h-3 bg-brand rounded-full"></span>
                Avg Latency (ms)
            </h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" opacity={0.2} vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(val) => val.split('-').slice(1).join('/')} stroke="#1A1A1A" axisLine={{ strokeWidth: 2 }} tickLine={{ strokeWidth: 2 }} />
                        <YAxis stroke="#1A1A1A" axisLine={{ strokeWidth: 2 }} tickLine={{ strokeWidth: 2 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#F8F9FA', border: '3px solid #1A1A1A', borderRadius: '0', boxShadow: '4px 4px 0px 0px #1A1A1A', fontWeight: 'bold' }}
                            itemStyle={{ color: '#1A1A1A' }}
                        />
                        <Line type="monotone" dataKey="latency" stroke="#FF004D" strokeWidth={4} dot={{ strokeWidth: 3, r: 6, fill: '#FFD45E' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
          </Card>
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
