import { useState, useEffect } from "react";
import { api } from '../../lib/api';
import { format } from 'date-fns';

export const AdminLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await api.get('/admin/logs');
      setLogs(res.data);
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b-4 border-text-primary pb-6">
        <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight text-brand">Global Logs</h1>
      </header>

      <div className="bg-surface rounded-geometric-lg border-4 border-text-primary shadow-solid overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-bg-secondary border-b-4 border-text-primary">
                <th className="p-5 font-display font-bold uppercase text-sm">Time</th>
                <th className="p-5 font-display font-bold uppercase text-sm">User ID</th>
                <th className="p-5 font-display font-bold uppercase text-sm">Upstream</th>
                <th className="p-5 font-display font-bold uppercase text-sm">Model</th>
                <th className="p-5 font-display font-bold uppercase text-sm">Tokens</th>
                <th className="p-5 font-display font-bold uppercase text-sm text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b-2 border-text-primary/10 hover:bg-brand-accent/10 transition-colors">
                  <td className="p-5 font-mono text-xs md:text-sm whitespace-nowrap">
                    {format(new Date(log.createdAt), 'MM/dd HH:mm:ss')}
                  </td>
                  <td className="p-5 font-mono text-xs">{log.userId?.substring(0, 8)}...</td>
                  <td className="p-5 font-mono text-xs">{log.upstreamKeyId?.substring(0, 8)}...</td>
                  <td className="p-5 font-bold text-sm max-w-[200px] truncate" title={log.model}>{log.model}</td>
                  <td className="p-5 font-mono text-sm bg-black/5 rounded font-bold text-center w-24">
                    {log.totalTokens}
                  </td>
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
              <p className="font-bold uppercase text-text-secondary">No global requests logged yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
