import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw] bg-brand rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[70vw] h-[70vw] md:w-[50vw] md:h-[50vw] bg-brand-accent rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>

      <div className="w-full max-w-md bg-surface border-4 border-text-primary p-8 md:p-10 rounded-geometric-lg shadow-solid relative z-10 transition-transform hover:-translate-y-1 duration-500">
        <div className="bg-brand inline-block px-4 py-2 rounded-geometric mb-6 border-2 border-text-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-2">
          <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter text-white">Agora</h1>
        </div>
        <p className="text-xl font-bold uppercase mb-8 text-text-primary bg-brand-accent inline-block px-4 py-2 rounded-full border-2 border-text-primary ml-2 rotate-1">Gateway</p>

        {error && (
          <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 rounded-geometric mb-6 font-bold uppercase text-sm" id="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold uppercase mb-2 pl-2">Username</label>
            <input
              type="text"
              id="username-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border-2 border-text-primary p-4 rounded-geometric bg-bg-primary font-sans focus:outline-none focus:ring-4 focus:ring-brand-accent/50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold uppercase mb-2 pl-2">Password</label>
            <input
              type="password"
              id="password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-text-primary p-4 rounded-geometric bg-bg-primary font-sans focus:outline-none focus:ring-4 focus:ring-brand-accent/50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              required
            />
          </div>
          <button
            type="submit"
            id="login-button"
            className="w-full bg-text-primary text-white font-bold uppercase py-4 rounded-geometric border-2 border-text-primary hover:bg-brand transition-all shadow-[6px_6px_0px_0px_rgba(255,212,94,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(255,212,94,1)] mt-4 text-lg"
          >
            Enter System
          </button>
        </form>
      </div>
    </div>
  );
};
