import { useState, useEffect } from "react";
import { api } from '../../lib/api';
import { format } from 'date-fns';

export const Users = () => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b-4 border-text-primary pb-6">
        <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight text-brand">Users</h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {users.map((u: any) => (
          <div key={u.id} className="bg-surface rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid relative hover:-translate-y-1 transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-text-primary rounded-full flex items-center justify-center border-2 border-brand-accent shadow-[2px_2px_0px_0px_rgba(255,212,94,1)] text-white font-display font-black text-xl">
                {u.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold uppercase truncate" title={u.username}>{u.username}</h3>
                <p className="font-mono text-[10px] text-text-secondary mt-1 bg-bg-secondary px-2 py-0.5 rounded inline-block">{u.id}</p>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t-4 border-text-primary/10 flex justify-between items-center">
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                u.role === 'ADMIN' ? 'bg-brand text-white border-brand' : 'bg-gray-200 text-gray-700 border-gray-400'
              }`}>
                {u.role}
              </span>
              <span className="text-xs font-bold uppercase text-text-secondary">
                {format(new Date(u.createdAt), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
