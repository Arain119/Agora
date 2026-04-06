import { useState, useEffect } from "react";
import { api } from '../lib/api';
import { format } from 'date-fns';

export const Logs = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await api.get('/logs');
      setLogs(res.data);
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b-4 border-text-primary pb-6">
        <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight">Request Logs</h1>
      </header>

      <div className="bg-surface rounded-geometric-lg border-4 border-text-primary shadow-solid overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-bg-secondary border-b-4 border-text-primary">
                <th className="p-5 font-display font-bold uppercase text-sm">Time</th>
                <th className="p-5 font-display font-bold uppercase text-sm">Model</th>
                <th className="p-5 font-display font-bold uppercase text-sm">Tokens (P/C/T)</th>
                <th className="p-5 font-display font-bold uppercase text-sm">Duration</th>
                <th className="p-5 font-display font-bold uppercase text-sm text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b-2 border-text-primary/10 hover:bg-brand-accent/20 transition-colors">
                  <td className="p-5 font-mono text-xs md:text-sm whitespace-nowrap">
                    {format(new Date(log.createdAt), 'MM/dd HH:mm:ss')}
                  </td>
                  <td className="p-5 font-bold text-sm">{log.model}</td>
                  <td className="p-5 font-mono text-sm bg-black/5 rounded">
                    {log.promptTokens} <span className="text-gray-400">/</span> {log.completionTokens} <span className="text-gray-400">/</span> <span className="font-bold text-black">{log.totalTokens}</span>
                  </td>
                  <td className="p-5 font-mono text-sm">{log.durationMs}ms</td>
                  <td className="p-5 text-center w-24">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border-2 inline-block ${
                      log.status === 200 ? 'border-green-500 text-green-800 bg-green-200' : 'border-red-500 text-red-800 bg-red-200'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="p-12 text-center bg-bg-primary">
              <p className="font-bold uppercase text-text-secondary">No requests logged yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
