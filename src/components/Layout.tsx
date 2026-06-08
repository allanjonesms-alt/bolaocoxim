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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <header className="bg-emerald-900 shadow-md border-b-2 border-yellow-400 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-yellow-400/10 p-2 rounded-lg group-hover:bg-yellow-400/20 transition-colors border border-yellow-400/20">
                <Trophy className="h-6 w-6 text-yellow-400" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight hidden sm:block text-white">BOLÃO COXIM <span className="text-yellow-400">2026</span></span>
            </Link>

            {profile && (
              <div className="flex items-center space-x-4 sm:space-x-6">
                <Link to="/" className="text-emerald-100 hover:text-yellow-400 transition" title="Início">
                  <Home className="h-5 w-5" />
                </Link>
                <Link to="/panel?openFinance=true" className="flex flex-col items-end group transition" title="Depositar ou Sacar">
                  <span className="text-sm font-medium text-emerald-50 group-hover:text-yellow-400 transition">{profile.name}</span>
                  <span className="text-xs text-yellow-300 bg-white/10 px-2.5 py-0.5 rounded-full mt-0.5 font-mono font-medium border border-yellow-400/20 shadow-inner group-hover:bg-white/20 transition-all duration-200">
                    R$ {profile.balance.toFixed(2)}
                  </span>
                </Link>
                
                <Link to="/panel" className="text-emerald-100 hover:text-yellow-400 transition" title="Painel do Usuário">
                  <User className="h-5 w-5" />
                </Link>
                
                {profile.role === 'admin' && (
                  <Link to="/admin" className="text-yellow-300 bg-emerald-800/80 border border-yellow-400/30 hover:bg-emerald-800 px-3 py-1.5 rounded-md text-sm transition font-medium">
                    Admin
                  </Link>
                )}
                
                <button onClick={handleLogout} className="text-emerald-200 hover:text-rose-300 transition ml-2 cursor-pointer" title="Sair">
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
      
      <footer className="bg-emerald-950 border-t border-emerald-900 text-emerald-1050/60 py-8 text-center text-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
          <Trophy className="h-5 w-5 text-yellow-400/60 mb-3" />
          <p className="text-emerald-100/70">&copy; 2026 BOLÃO COXIM 2026. Jogue com responsabilidade.</p>
        </div>
      </footer>
    </div>
  );
}
