import { useState, useEffect } from "react";
import { api } from '../lib/api';
import { format } from 'date-fns';
import { Copy, Plus, Trash2 } from 'lucide-react';

export const Tokens = () => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [name, setName] = useState('');

  const fetchTokens = async () => {
    const res = await api.get('/tokens');
    setTokens(res.data);
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    await api.post('/tokens', { name });
    setName('');
    fetchTokens();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await api.delete(`/tokens/${id}`);
      fetchTokens();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b-4 border-text-primary pb-6">
        <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight">API Tokens</h1>
      </header>

      <div className="bg-surface rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid">
        <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold uppercase mb-2 pl-2">New Token Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production App"
              className="w-full border-2 border-text-primary p-4 rounded-geometric bg-bg-primary focus:outline-none focus:ring-4 focus:ring-brand-accent/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto bg-brand text-white font-bold uppercase px-8 py-4 rounded-geometric border-2 border-text-primary hover:bg-text-primary transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none flex items-center justify-center gap-2"
          >
            <Plus size={20} strokeWidth={3} /> Create
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tokens.map((token: any) => (
          <div key={token.id} className="bg-surface rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:-translate-y-1 transition-transform">
            <div className="w-full md:w-auto">
              <h3 className="text-2xl font-display font-bold uppercase flex items-center gap-3">
                <span className="w-3 h-3 bg-brand-accent rounded-full inline-block border-2 border-text-primary"></span>
                {token.name}
              </h3>
              <div className="font-mono text-xs md:text-sm bg-bg-primary p-3 rounded-geometric border-2 border-text-primary mt-4 flex items-center justify-between gap-4">
                <span className="truncate">{token.token.substring(0, 12)}...{token.token.substring(token.token.length - 4)}</span>
                <button onClick={() => copyToClipboard(token.token)} className="hover:text-brand transition-colors p-2 bg-white rounded-md border-2 border-text-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[2px] active:translate-x-[2px]">
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-6 border-t-2 border-text-primary/10 pt-4 md:border-0 md:pt-0">
              <div className="text-left md:text-right">
                <p className="text-xs font-bold uppercase text-text-secondary bg-bg-primary inline-block px-2 py-1 rounded-full mb-1">Created</p>
                <p className="font-bold">{format(new Date(token.createdAt), 'MMM dd, yyyy')}</p>
              </div>
              <button
                onClick={() => handleDelete(token.id)}
                className="p-3 bg-red-100 rounded-full text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] active:shadow-none active:translate-y-[4px] active:translate-x-[4px]"
              >
                <Trash2 size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
        {tokens.length === 0 && (
          <div className="p-12 text-center rounded-geometric-lg border-4 border-dashed border-text-secondary bg-bg-secondary">
            <p className="text-xl font-bold uppercase text-text-secondary">No tokens generated yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
