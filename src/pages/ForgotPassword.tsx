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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-yellow-101 selection:text-emerald-900 animate-fade-in">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[3px] bg-gradient-to-r from-transparent via-emerald-600 to-transparent"></div>
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-50 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="flex flex-col items-center mb-6 relative z-10">
          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl mb-4 shadow-sm">
            <Trophy className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-800 tracking-tight">Recuperar Senha</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-650 p-4 rounded-xl mb-6 text-sm border border-red-100 flex items-center shadow-inner relative z-10">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl mb-6 text-sm border border-emerald-100 flex items-center shadow-inner relative z-10">
             <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 10.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 ml-1">Seu E-mail</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/35 focus:border-emerald-600 outline-none text-slate-800 placeholder-slate-400 transition-all font-medium text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 mt-6 shadow-md shadow-emerald-600/10 hover:shadow-lg transform hover:-translate-y-0.5 cursor-pointer"
          >
            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium relative z-10">
          <Link to="/login" className="text-emerald-650 hover:text-emerald-750 font-bold transition-colors border-b border-emerald-550/30 pb-0.5">
            Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
}
