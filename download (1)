import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Trophy } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Instruções enviadas para seu e-mail.');
    } catch (err: any) {
      setError('Erro ao enviar e-mail. Verifique se o endereço está correto.');
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

        <div className="flex flex-col items-center mb-6 relative z-10">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Trophy className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Recuperar Senha</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 text-sm border border-red-500/20 flex items-center shadow-inner relative z-10">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl mb-6 text-sm border border-emerald-500/20 flex items-center shadow-inner relative z-10">
             <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 10.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4 relative z-10">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Seu E-mail</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-white placeholder-slate-600 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 mt-6 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5"
          >
            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium relative z-10">
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
}
