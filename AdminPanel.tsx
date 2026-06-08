import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Trophy } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userRef = doc(db, 'users', userCredential.user.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        const userRole = email.startsWith('allanjonesms') ? 'admin' : 'user';
        await setDoc(userRef, {
          name: userCredential.user.displayName || email.split('@')[0],
          email: email,
          phone: '',
          pix_key: '',
          balance: 0,
          role: userRole,
          createdAt: serverTimestamp()
        });
      }
      
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
         setError('Credenciais inválidas. Se você tem certeza da senha, você pode ter criado esta conta usando Google Auth ou outro provedor. Tente a opção "Esqueci minha senha".');
      } else {
         setError(err.message || 'E-mail ou senha incorretos.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', userCredential.user.uid);
      const docSnap = await getDoc(userRef);
      
      const userEmail = userCredential.user.email || '';
      
      if (!docSnap.exists()) {
        const userRole = userEmail.startsWith('allanjonesms') ? 'admin' : 'user';
        await setDoc(userRef, {
          name: userCredential.user.displayName || userEmail.split('@')[0],
          email: userEmail,
          phone: '',
          pix_key: '',
          balance: 0,
          role: userRole,
          createdAt: serverTimestamp()
        });
      }
      
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login com Google cancelado pelo usuário.');
      } else {
        setError(err.message || 'Erro ao entrar com Google.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-emerald-500/30">
      <div className="max-w-md w-full bg-slate-900 border border-white/5 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl mb-5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Trophy className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Bet<span className="text-emerald-400">2026</span></h1>
          <p className="text-slate-400 mt-2 text-center text-sm font-medium">
            Sua central de palpites e prêmios.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 text-sm border border-red-500/20 flex items-center shadow-inner relative z-10">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6 relative z-10">
          <button 
            type="button" 
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full flex justify-center items-center bg-white hover:bg-slate-50 text-slate-900 border-none font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </button>
        </div>

        <div className="relative mb-6 z-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm font-medium">
            <span className="px-3 bg-slate-900 text-slate-500 uppercase tracking-wider text-xs">Ou com e-mail</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">E-mail</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-white placeholder-slate-600 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5 ml-1 mr-1">
              <label className="block text-sm font-medium text-slate-300">Senha</label>
              <Link to="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                Esqueci
              </Link>
            </div>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-white placeholder-slate-600 transition-all font-sans tracking-widest"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 mt-6 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5 relative overflow-hidden"
          >
            {loading ? 'Processando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500 relative z-10 font-medium">
          Ainda não tem conta?{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
            Cadastre-se agora
          </Link>
        </div>
      </div>
    </div>
  );
}
