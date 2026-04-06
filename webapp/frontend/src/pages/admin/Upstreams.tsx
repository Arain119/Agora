import { useState, useEffect } from "react";
import { api } from '../../lib/api';
import { format } from 'date-fns';
import { Power, PowerOff, Trash2, Plus } from 'lucide-react';

export const Upstreams = () => {
  const [upstreams, setUpstreams] = useState<any[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');

  const fetchUpstreams = async () => {
    const res = await api.get('/admin/upstreams');
    setUpstreams(res.data);
  };

  useEffect(() => {
    fetchUpstreams();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey || !newName) return;
    await api.post('/admin/upstreams', { key: newKey, name: newName });
    setNewKey('');
    setNewName('');
    fetchUpstreams();
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await api.patch(`/admin/upstreams/${id}`, { isActive: !currentStatus });
    fetchUpstreams();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this upstream key?')) {
      await api.delete(`/admin/upstreams/${id}`);
      fetchUpstreams();
    }
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b-4 border-text-primary pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight text-brand">Upstreams</h1>
          <p className="text-lg md:text-xl font-bold text-text-secondary mt-2">NVIDIA API Key Management</p>
        </div>
      </header>

      <div className="bg-surface rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid">
        <form onSubmit={handleCreate} className="flex flex-col xl:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold uppercase mb-2 pl-2">Display Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. NVIDIA Key 6"
              className="w-full border-2 border-text-primary p-4 rounded-geometric bg-bg-primary focus:outline-none focus:ring-4 focus:ring-brand-accent/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>
          <div className="flex-2 w-full xl:w-1/2">
            <label className="block text-sm font-bold uppercase mb-2 pl-2">API Key</label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="nvapi-..."
              className="w-full border-2 border-text-primary p-4 rounded-geometric bg-bg-primary font-mono text-sm focus:outline-none focus:ring-4 focus:ring-brand-accent/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full xl:w-auto bg-brand text-white font-bold uppercase px-8 py-4 rounded-geometric border-2 border-text-primary hover:bg-text-primary transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none flex items-center justify-center gap-2"
          >
            <Plus size={20} strokeWidth={3} /> Add
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {upstreams.map((up: any) => (
          <div key={up.id} className={`rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${up.isActive ? 'bg-surface' : 'bg-gray-200 text-gray-500 shadow-none translate-y-1 translate-x-1'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
              <div className="w-full sm:w-[70%] overflow-hidden">
                <h3 className="text-2xl font-display font-bold uppercase truncate" title={up.name}>{up.name}</h3>
                <div className="bg-bg-primary p-3 rounded-geometric border-2 border-text-primary/20 mt-3 overflow-x-auto">
                  <p className="font-mono text-xs">{up.key}</p>
                </div>
              </div>
              <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase border-2 flex-shrink-0 ${up.isActive ? 'border-green-500 text-green-800 bg-green-200' : 'border-gray-400 text-gray-700 bg-gray-100'}`}>
                {up.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-t-4 border-text-primary/10 pt-6 mt-2 gap-4">
              <div className="space-y-2 w-full sm:w-auto flex sm:flex-col justify-between sm:justify-start">
                <p className="text-xs font-bold uppercase bg-white/50 inline-block px-2 py-1 rounded">Errors: <span className={up.errorCount > 0 ? 'text-red-600 bg-red-100 px-2 py-0.5 rounded' : ''}>{up.errorCount}</span></p>
                <p className="text-xs font-bold uppercase bg-white/50 inline-block px-2 py-1 rounded">Last Used: <br className="hidden sm:block" />{up.lastUsedAt ? format(new Date(up.lastUsedAt), 'MM/dd HH:mm:ss') : 'Never'}</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => toggleStatus(up.id, up.isActive)}
                  className={`p-3 rounded-full border-2 border-text-primary transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${up.isActive ? 'bg-brand-accent text-text-primary hover:bg-yellow-400' : 'bg-green-400 hover:bg-green-500 text-text-primary'}`}
                  title={up.isActive ? "Disable" : "Enable"}
                >
                  {up.isActive ? <PowerOff size={20} strokeWidth={2.5} /> : <Power size={20} strokeWidth={2.5} />}
                </button>
                <button
                  onClick={() => handleDelete(up.id)}
                  className="p-3 rounded-full border-2 border-text-primary bg-red-400 hover:bg-red-500 text-text-primary transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  <Trash2 size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
