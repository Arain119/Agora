import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import { Ban, Copy, Plus, RefreshCw } from 'lucide-react';

type Invite = {
  id: string;
  status: 'ACTIVE' | 'USED' | 'REVOKED';
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdByUserId: string;
  usedAt: string | null;
  usedByUserId: string | null;
  revokedAt: string | null;
  revokedByUserId: string | null;
};

type CreatedInvite = {
  id: string;
  code: string;
  expiresAt: string | null;
};

function statusStyles(status: Invite['status']) {
  switch (status) {
    case 'ACTIVE':
      return 'border-green-500 text-green-800 bg-green-200';
    case 'USED':
      return 'border-blue-500 text-blue-800 bg-blue-200';
    case 'REVOKED':
      return 'border-red-500 text-red-800 bg-red-200';
    default:
      return 'border-gray-400 text-gray-700 bg-gray-100';
  }
}

const FILTERS: Array<{ label: string; value: string }> = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Used', value: 'USED' },
  { label: 'Revoked', value: 'REVOKED' },
  { label: 'All', value: 'ALL' }
];

export const Invites = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('ACTIVE');

  const [count, setCount] = useState<number>(1);
  const [expiresInDays, setExpiresInDays] = useState<number>(0);
  const [note, setNote] = useState<string>('');

  const [created, setCreated] = useState<CreatedInvite[]>([]);

  const fetchInvites = async () => {
    setLoading(true);
    setError('');
    try {
      const params = filter === 'ALL' ? undefined : { status: filter };
      const res = await api.get('/admin/invites', { params });
      setInvites(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch invites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const createInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreated([]);
    try {
      const res = await api.post('/admin/invites', {
        count,
        expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
        note: note.trim() || undefined
      });
      setCreated(res.data?.invites || []);
      setNote('');
      setCount(1);
      setExpiresInDays(0);
      fetchInvites();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create invites');
    }
  };

  const revokeInvite = async (id: string) => {
    if (!confirm('Revoke this invite? This cannot be undone.')) return;
    try {
      await api.post(`/admin/invites/${id}/revoke`);
      fetchInvites();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Revoke failed');
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied');
    } catch {
      alert('Copy failed');
    }
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b-4 border-text-primary pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight text-brand">Invites</h1>
          <p className="text-lg md:text-xl font-bold text-text-secondary mt-2">Create and revoke invite codes</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border-2 border-text-primary p-3 rounded-geometric bg-bg-primary font-bold uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <button
            onClick={fetchInvites}
            className="bg-brand text-white font-bold uppercase px-6 py-3 rounded-geometric border-2 border-text-primary hover:bg-text-primary transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} strokeWidth={3} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 rounded-geometric font-bold uppercase text-sm">
          {error}
        </div>
      )}

      <div className="bg-surface rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid">
        <form onSubmit={createInvites} className="flex flex-col xl:flex-row gap-6 items-end">
          <div className="w-full xl:w-40">
            <label className="block text-sm font-bold uppercase mb-2 pl-2">Count</label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value || 1))}
              className="w-full border-2 border-text-primary p-4 rounded-geometric bg-bg-primary font-sans focus:outline-none focus:ring-4 focus:ring-brand-accent/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>

          <div className="w-full xl:w-56">
            <label className="block text-sm font-bold uppercase mb-2 pl-2">Expires (days)</label>
            <input
              type="number"
              min={0}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value || 0))}
              placeholder="0 = never"
              className="w-full border-2 border-text-primary p-4 rounded-geometric bg-bg-primary font-sans focus:outline-none focus:ring-4 focus:ring-brand-accent/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>

          <div className="flex-1 w-full">
            <label className="block text-sm font-bold uppercase mb-2 pl-2">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. For Alice"
              className="w-full border-2 border-text-primary p-4 rounded-geometric bg-bg-primary font-sans focus:outline-none focus:ring-4 focus:ring-brand-accent/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full xl:w-auto bg-brand text-white font-bold uppercase px-8 py-4 rounded-geometric border-2 border-text-primary hover:bg-text-primary transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none flex items-center justify-center gap-2"
          >
            <Plus size={20} strokeWidth={3} /> Create
          </button>
        </form>

        {created.length > 0 && (
          <div className="mt-8 bg-green-100 border-2 border-green-500 text-green-900 p-4 rounded-geometric">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="font-bold uppercase text-sm">New invite code(s). Copy now — they won&apos;t be shown again.</p>
              <button
                type="button"
                onClick={() => copyText(created.map((c) => c.code).join('\n'))}
                className="bg-text-primary text-white font-bold uppercase px-4 py-2 rounded-geometric border-2 border-text-primary hover:bg-brand transition-all shadow-[4px_4px_0px_0px_rgba(255,212,94,1)]"
              >
                <Copy size={16} className="inline-block mr-2" />
                Copy All
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {created.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 bg-white/60 border-2 border-green-700/20 rounded-geometric p-3">
                  <div className="min-w-0">
                    <div className="font-mono text-sm break-all">{c.code}</div>
                    {c.expiresAt && (
                      <div className="text-xs font-bold uppercase text-green-900/70 mt-1">Expires: {format(new Date(c.expiresAt), 'MM/dd HH:mm:ss')}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(c.code)}
                    className="p-3 rounded-full border-2 border-text-primary bg-brand-accent hover:bg-yellow-400 text-text-primary transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    title="Copy"
                  >
                    <Copy size={18} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-bg-primary border-2 border-text-primary p-4 rounded-geometric font-bold uppercase text-sm">Loading...</div>
      )}

      {!loading && invites.length === 0 && (
        <div className="bg-surface rounded-geometric-lg border-4 border-text-primary p-8 shadow-solid text-center">
          <p className="font-bold uppercase text-text-secondary">No invites</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {invites.map((inv) => {
          const isActive = inv.status === 'ACTIVE';
          return (
            <div key={inv.id} className="bg-surface rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="w-full overflow-hidden">
                  <h3 className="text-2xl font-display font-bold uppercase truncate" title={inv.note || inv.id}>
                    {inv.note || 'Invite'}
                  </h3>
                  <p className="font-mono text-[10px] text-text-secondary mt-2 bg-bg-secondary px-2 py-0.5 rounded inline-block">
                    {inv.id}
                  </p>
                </div>

                <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase border-2 flex-shrink-0 ${statusStyles(inv.status)}`}>
                  {inv.status}
                </span>
              </div>

              <div className="mt-6 pt-6 border-t-4 border-text-primary/10 space-y-2">
                <p className="text-xs font-bold uppercase text-text-secondary">
                  Created: {format(new Date(inv.createdAt), 'MM/dd HH:mm:ss')}
                </p>
                {inv.expiresAt && (
                  <p className="text-xs font-bold uppercase text-text-secondary">
                    Expires: {format(new Date(inv.expiresAt), 'MM/dd HH:mm:ss')}
                  </p>
                )}
                {inv.usedAt && (
                  <p className="text-xs font-bold uppercase text-text-secondary">
                    Used: {format(new Date(inv.usedAt), 'MM/dd HH:mm:ss')}
                  </p>
                )}
                {inv.revokedAt && (
                  <p className="text-xs font-bold uppercase text-text-secondary">
                    Revoked: {format(new Date(inv.revokedAt), 'MM/dd HH:mm:ss')}
                  </p>
                )}
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => revokeInvite(inv.id)}
                  disabled={!isActive}
                  className={`p-3 rounded-full border-2 border-text-primary transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                    isActive ? 'bg-red-400 hover:bg-red-500 text-text-primary' : 'bg-gray-200 text-gray-500 shadow-none cursor-not-allowed'
                  }`}
                  title={isActive ? 'Revoke' : 'Not active'}
                >
                  <Ban size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

