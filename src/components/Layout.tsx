import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Menu, Trophy, Home } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
      <header className="bg-slate-900 border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-emerald-500/10 p-2 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                <Trophy className="h-6 w-6 text-emerald-400" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight hidden sm:block text-white">Bet<span className="text-emerald-400">2026</span></span>
            </Link>

            {profile && (
              <div className="flex items-center space-x-4 sm:space-x-6">
                <Link to="/" className="text-slate-400 hover:text-emerald-400 transition" title="Início">
                  <Home className="h-5 w-5" />
                </Link>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-slate-200">{profile.name}</span>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full mt-0.5 font-mono font-medium border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    R$ {profile.balance.toFixed(2)}
                  </span>
                </div>
                
                <Link to="/panel" className="text-slate-400 hover:text-emerald-400 transition" title="Painel do Usuário">
                  <User className="h-5 w-5" />
                </Link>
                
                {profile.role === 'admin' && (
                  <Link to="/admin" className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 px-3 py-1.5 rounded-md text-sm transition font-medium">
                    Admin
                  </Link>
                )}
                
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition ml-2" title="Sair">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
      
      <footer className="bg-slate-900 border-t border-white/5 text-slate-500 py-8 text-center text-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
          <Trophy className="h-5 w-5 text-emerald-500/50 mb-3" />
          <p>&copy; 2026 Bet2026. Jogue com responsabilidade.</p>
        </div>
      </footer>
    </div>
  );
}
