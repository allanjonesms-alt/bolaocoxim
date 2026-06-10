import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Menu, Trophy, Home, BookOpen, Bell, CheckCircle2, X } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface PixRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: string;
  verified: boolean;
  timestamp: any;
}

export default function Layout() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [pixRequests, setPixRequests] = useState<PixRequest[]>([]);
  const [showPixModal, setShowPixModal] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      const q = query(
        collection(db, 'pix_requests'),
        where('verified', '==', false)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPixRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PixRequest)));
      });
      return () => unsubscribe();
    }
  }, [profile?.role]);

  const handleVerifyPixRequest = async (id: string) => {
    await updateDoc(doc(db, 'pix_requests', id), { verified: true });
  };

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
                <Link to="/regulamento" className="text-emerald-100 hover:text-yellow-400 transition" title="Regulamento">
                  <BookOpen className="h-5 w-5" />
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
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => setShowPixModal(true)}
                      className="relative text-emerald-100 hover:text-yellow-400 transition"
                      title="Solicitações de PIX"
                    >
                      <Bell className="h-5 w-5" />
                      {pixRequests.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                      )}
                    </button>
                    <Link to="/admin" className="text-yellow-300 bg-emerald-800/80 border border-yellow-400/30 hover:bg-emerald-800 px-3 py-1.5 rounded-md text-sm transition font-medium">
                      Admin
                    </Link>
                  </div>
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
      
      <footer className="bg-emerald-950 border-t border-emerald-900 text-emerald-100/60 py-8 text-center text-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center space-y-4">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-emerald-200/85 font-medium">
            <Link to="/" className="hover:text-yellow-400 transition">Início</Link>
            <Link to="/regulamento" className="hover:text-yellow-400 transition">Regulamento</Link>
            <Link to="/leaderboard" className="hover:text-yellow-400 transition">Classificação Geral</Link>
            <Link to="/panel" className="hover:text-yellow-400 transition">Minhas Apostas</Link>
          </div>
          <div className="flex flex-col items-center pt-2">
            <Trophy className="h-5 w-5 text-yellow-400/40 mb-2" />
            <p className="text-emerald-100/50">&copy; 2026 BOLÃO COXIM 2026. Jogue com responsabilidade.</p>
          </div>
        </div>
      </footer>

      {/* Pix Requests Modal for Admins */}
      {showPixModal && profile?.role === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-lg p-6 relative overflow-hidden">
            <button 
              onClick={() => setShowPixModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-display font-bold text-slate-800 mb-6 flex items-center">
              <Bell className="h-6 w-6 mr-3 text-emerald-600" />
              Solicitações de PIX Pendentes
            </h3>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {pixRequests.length === 0 ? (
                <p className="text-slate-500 font-medium text-center py-8">Nenhuma solicitação pendente.</p>
              ) : (
                pixRequests.map(req => (
                  <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{req.userName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                          R$ {req.amount.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium lowercase">
                          {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleString() : ''}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleVerifyPixRequest(req.id)}
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-2.5 rounded-xl transition-colors shrink-0"
                      title="Verificar"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
