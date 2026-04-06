import { useState, useEffect } from "react";
import { api } from '../lib/api';

export const Models = () => {
  const [models, setModels] = useState<any[]>([]);

  useEffect(() => {
    const fetchModels = async () => {
      const res = await api.get('/models');
      setModels(res.data.data);
    };
    fetchModels();
  }, []);

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b-4 border-text-primary pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight">Available Models</h1>
          <p className="text-lg md:text-xl font-bold text-text-secondary mt-2">NVIDIA API Gateway Support</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {models.map((model: any) => (
          <div key={model.id} className="bg-surface rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid relative overflow-hidden group hover:bg-brand hover:text-white transition-colors duration-300">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 border-[12px] border-brand-accent rounded-full opacity-20 group-hover:scale-150 group-hover:border-white transition-all duration-700 pointer-events-none"></div>

            <span className="inline-block px-4 py-1.5 bg-text-primary rounded-full text-white text-xs font-bold uppercase tracking-widest mb-6 group-hover:bg-white group-hover:text-text-primary shadow-[2px_2px_0px_0px_rgba(255,212,94,1)] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {model.owned_by}
            </span>

            <h3 className="text-2xl md:text-3xl font-display font-bold mb-6 break-words leading-tight">{model.id}</h3>

            <div className="mt-8 pt-6 border-t-4 border-text-primary group-hover:border-white/30 flex justify-between">
              <span className="text-xs font-bold uppercase bg-bg-secondary group-hover:bg-black/20 px-3 py-1 rounded-geometric">Object: {model.object}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
