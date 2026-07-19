import { useState } from 'react';
import AdminPixPremiado from './AdminPixPremiado';
import AdminMinutoCerto from './AdminMinutoCerto';
import { Sparkles, Clock, ArrowLeft, Trophy, Dices } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminSorteios() {
  const [activeTab, setActiveTab] = useState<'pix_premiado' | 'minuto_certo'>('pix_premiado');

  return (
    <div className="max-w-7xl mx-auto py-4 space-y-6 animate-fade-in" id="admin-sorteios-container">
      {/* Tab Header Selector */}
      <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6" id="sorteios-header-card">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer" id="back-to-admin-link">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-extrabold text-slate-900 flex items-center gap-2">
              <Dices className="w-7 h-7 text-amber-500 animate-spin-slow" />
              Sorteios Especiais
            </h1>
            <p className="text-slate-500 text-sm font-medium">Gestão integrada do PIX Premiado e do Minuto Certo</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50" id="sorteios-tab-selector">
          <button
            onClick={() => setActiveTab('pix_premiado')}
            className={`px-6 py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pix_premiado'
                ? 'bg-gradient-to-r from-emerald-800 to-emerald-900 text-white shadow-md font-black'
                : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50/60'
            }`}
            id="tab-pix-premiado"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            PIX Premiado
          </button>
          
          <button
            onClick={() => setActiveTab('minuto_certo')}
            className={`px-6 py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'minuto_certo'
                ? 'bg-gradient-to-r from-emerald-800 to-emerald-900 text-white shadow-md font-black'
                : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50/60'
            }`}
            id="tab-minuto-certo"
          >
            <Clock className="w-4 h-4 text-yellow-400" />
            Minuto Certo
          </button>
        </div>
      </div>

      {/* Render selected draw management component */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200 transition-all duration-300" id="sorteios-content-panel">
        {activeTab === 'pix_premiado' ? (
          <AdminPixPremiado isSubcomponent={true} />
        ) : (
          <AdminMinutoCerto isSubcomponent={true} />
        )}
      </div>
    </div>
  );
}
