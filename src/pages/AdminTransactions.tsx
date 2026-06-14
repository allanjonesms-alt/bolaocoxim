import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction, UserProfile } from '../types';
import { ArrowLeft, Wallet, Search, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const fetchedTrans = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      fetchedTrans.sort((a, b) => {
        const timeA = a.timestamp ? (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (a.timestamp as any).seconds ? (a.timestamp as any).seconds * 1000 : 0) : 0;
        const timeB = b.timestamp ? (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (b.timestamp as any).seconds ? (b.timestamp as any).seconds * 1000 : 0) : 0;
        return timeB - timeA;
      });
      setTransactions(fetchedTrans);
      if (users.length > 0) setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
      setLoading(false);
    });

    return () => { unsubTransactions(); unsubUsers(); };
  }, [users.length]);

  const formatDateTime = (ts: any) => {
    if (!ts) return '-';
    let date: Date;
    if (typeof ts === 'string') date = new Date(ts);
    else if (ts && typeof ts.toDate === 'function') date = ts.toDate();
    else if (ts && ts.seconds) date = new Date(ts.seconds * 1000);
    else date = new Date(ts);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const filteredTransactions = transactions.filter(t => {
    if (!filter) return true;
    const user = users.find(u => u.id === t.userId);
    const searchString = `${user?.name || ''} ${user?.displayId || ''} ${t.type} ${t.status}`.toLowerCase();
    return searchString.includes(filter.toLowerCase());
  });

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'Adição (Depósito)';
      case 'withdrawal': return 'Saque';
      case 'manual_deduction': return 'Remoção Manual';
      case 'bet': return 'Aposta';
      case 'prize': return 'Prêmio';
      default: return type.toUpperCase();
    }
  };

  const getTransactionTypeColor = (type: string) => {
    if (['deposit', 'prize'].includes(type)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (['bet', 'withdrawal', 'manual_deduction'].includes(type)) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Carregando logs de transações...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] shadow-xl animate-fade-in">
          <div className={`p-2 rounded-xl ${toast.type === 'success' ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className={`flex items-start gap-4 p-4 border rounded-lg bg-white ${toast.type === 'success' ? 'border-emerald-200' : 'border-red-200'}`}>
              <div className={`p-1.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {toast.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-red-600" />}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{toast.type === 'success' ? 'Sucesso' : 'Erro'}</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">{toast.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-display font-bold text-slate-800 flex items-center gap-3">
            <Wallet className="h-8 w-8 text-blue-600" />
            Transações
          </h1>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search className="w-4 h-4" /></span>
          <input 
            type="text" 
            placeholder="Buscar por usuário, tipo ou status..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium text-slate-700"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200">
        <div className="overflow-x-auto custom-scrollbar border border-slate-150 rounded-2xl">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <th className="py-4 px-5 w-48">Data/Hora</th>
                <th className="py-4 px-5 flex-1">Usuário / PIX</th>
                <th className="py-4 px-5">Tipo</th>
                <th className="py-4 px-5">Valor</th>
                <th className="py-4 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600 bg-white">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">Nenhuma transação encontrada.</td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  const u = users.find(usr => usr.id === t.userId);
                  const isPositive = ['deposit', 'prize'].includes(t.type);
                  
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="py-3 px-5 font-mono text-xs text-slate-500">
                        {formatDateTime(t.timestamp)}
                        {t.type === 'withdrawal' && t.pixReceiptDate && (
                           <div className="mt-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 w-fit">
                             PIX: {formatDateTime(t.pixReceiptDate)}
                           </div>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <div className="font-bold text-slate-800">
                          {u?.displayId && <span className="text-emerald-700 font-mono mr-1.5 text-xs">#{u.displayId}</span>}
                          {u?.name || 'Desconhecido'}
                        </div>
                        {t.type === 'withdrawal' && u?.pix_key && (
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            Chave PIX: {u.pix_key}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-5">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTransactionTypeColor(t.type)}`}>
                           {getTransactionTypeLabel(t.type)}
                         </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? '+' : '-'} R$ {t.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                           t.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                           t.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                           'bg-red-50 text-red-700 border-red-200'
                         }`}>
                           {t.status === 'confirmed' ? 'Confirmado' : t.status === 'pending' ? 'Pendente' : 'Recusado'}
                         </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
