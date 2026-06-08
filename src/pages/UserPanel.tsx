import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Bet, Transaction, Match } from '../types';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { QrCode, Wallet, ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2, Trophy } from 'lucide-react';

export default function UserPanel() {
  const { user, profile } = useAuth();
  const [bets, setBets] = useState<(Bet & { match?: Match })[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [showPix, setShowPix] = useState(false);
  const [depositAmount, setDepositAmount] = useState('50');
  const [requestWithdraw, setRequestWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  useEffect(() => {
    if (!user) return;
    
    const qBets = query(collection(db, 'bets'), where('userId', '==', user.uid));
    const unsubBets = onSnapshot(qBets, async (snapshot) => {
      const betsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Bet));
      setBets(betsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bets'));
    
    const qTrans = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const transData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      transData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransactions(transData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    return () => { unsubBets(); unsubTrans(); };
  }, [user]);

  const handleDepositRequest = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user!.uid,
        type: 'deposit',
        amount,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setShowPix(true);
    } catch(err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    }
  };

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > profile!.balance) {
      alert('Valor inválido ou saldo insuficiente.');
      return;
    }
    
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user!.uid,
        type: 'withdrawal',
        amount,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setRequestWithdraw(false);
      setWithdrawAmount('');
      alert('Solicitação de saque enviada com sucesso! O administrador fará a transferência e debitará de seu saldo.');
    } catch(err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-display font-bold text-white tracking-tight">Painel do Usuário</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-slate-900 rounded-3xl shadow-xl border border-white/5 p-8 md:col-span-1 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none"></div>
          
          <div className="h-24 w-24 bg-slate-800 border-2 border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center text-4xl font-display font-bold mb-5 shadow-[0_0_20px_rgba(16,185,129,0.15)] relative z-10">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-display font-bold text-white relative z-10">{profile.name}</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium relative z-10">{profile.email}</p>
          
          <div className="bg-slate-950/50 w-full p-5 rounded-2xl border border-white/5 flex flex-col items-center relative z-10">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Saldo Disponível</span>
            <span className="text-4xl font-bold text-emerald-400 font-mono">R$ {profile.balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Banking Controls */}
        <div className="bg-slate-900 rounded-3xl shadow-xl border border-white/5 p-8 md:col-span-2 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-[60px] pointer-events-none"></div>
          
          <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center relative z-10">
            <Wallet className="h-6 w-6 mr-3 text-slate-400" />
            Movimentação Financeira
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1 relative z-10">
            {/* Deposit */}
            <div className="bg-slate-950/50 border border-emerald-500/20 rounded-2xl p-6 flex flex-col shadow-inner">
              <h4 className="font-bold text-white mb-2 flex items-center text-lg">
                <ArrowDownToLine className="h-5 w-5 mr-2 text-emerald-400" /> Depositar
              </h4>
              <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">Adicione créditos para fazer apostas. Suas apostas pendentes serão confirmadas automaticamente.</p>
              
              {!showPix ? (
                <div className="mt-auto space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                    <input 
                      type="number" 
                      value={depositAmount} 
                      onChange={e => setDepositAmount(e.target.value)} 
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <button onClick={handleDepositRequest} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl py-3.5 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    Gerar PIX
                  </button>
                </div>
              ) : (
                <div className="mt-auto flex flex-col items-center bg-white p-5 rounded-xl border border-emerald-500/30 relative">
                  <QrCode className="h-32 w-32 text-slate-900 mb-3" />
                  <p className="text-xs text-center text-slate-600 font-medium">Escaneie o QR Code no seu app de banco. (Simulação)</p>
                  <button onClick={() => setShowPix(false)} className="mt-4 text-xsfont-bold text-emerald-600 hover:text-emerald-500 uppercase tracking-widest">Concluído</button>
                </div>
              )}
            </div>

            {/* Withdraw */}
            <div className="bg-slate-950/50 border border-white/10 rounded-2xl p-6 flex flex-col shadow-inner">
              <h4 className="font-bold text-white mb-2 flex items-center text-lg">
                <ArrowUpFromLine className="h-5 w-5 mr-2 text-slate-400" /> Sacar
              </h4>
              <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">Solicite o saque do seu saldo. O administrador fará a transferência para sua chave PIX.</p>
              
              {!requestWithdraw ? (
                <button onClick={() => setRequestWithdraw(true)} className="mt-auto w-full bg-slate-800 hover:bg-slate-700 text-white border border-white/5 rounded-xl py-3.5 font-bold transition-colors">
                  Solicitar Saque
                </button>
              ) : (
                <div className="mt-auto space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                    <input 
                      type="number" 
                      value={withdrawAmount} 
                      onChange={e => setWithdrawAmount(e.target.value)} 
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={handleWithdrawRequest} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl py-3.5 transition-colors">
                      Confirmar
                    </button>
                    <button onClick={() => setRequestWithdraw(false)} className="px-5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors border border-white/5">
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-3xl shadow-xl border border-white/5 p-8 relative overflow-hidden">
          <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center">
            Minhas Apostas
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {bets.length === 0 ? <p className="text-sm text-slate-500 font-medium text-center py-8">Nenhuma aposta realizada.</p> : bets.map(bet => (
              <div key={bet.id} className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 flex justify-between items-center hover:border-white/10 transition-colors">
                <div>
                  <div className="text-white font-bold text-lg font-mono mb-1">Palpite: {bet.predicted1} <span className="text-slate-600">x</span> {bet.predicted2}</div>
                  <div className="text-xs font-medium bg-slate-900 inline-block px-2 py-1 rounded border border-white/5">
                    Status: 
                    <span className={bet.status === 'pending' ? 'text-orange-400 ml-1' : 'text-emerald-400 ml-1'}>
                      {bet.status === 'pending' ? 'Pendente' : 'Confirmada'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Aposta</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">R$ {bet.amount.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl shadow-xl border border-white/5 p-8 relative overflow-hidden">
          <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center">
            Histórico de Transações
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {transactions.length === 0 ? <p className="text-sm text-slate-500 font-medium text-center py-8">Nenhuma transação.</p> : transactions.map(t => (
              <div key={t.id} className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 flex justify-between items-center hover:border-white/10 transition-colors">
                <div className="flex items-center">
                  <div className={`p-3 rounded-xl mr-4 ${t.status === 'pending' ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                    {t.status === 'pending' ? <Clock className="h-5 w-5 text-orange-400" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                  </div>
                  <div>
                    <div className="text-white font-bold capitalize text-base tracking-wide">{
                      t.type === 'deposit' ? 'Depósito' : 
                      t.type === 'withdrawal' ? 'Saque' : 
                      t.type === 'prize' ? 'Prêmio Recebido' : 'Aposta'
                    }</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">{new Date(t.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className={`text-lg font-mono font-bold px-3 py-1 rounded-lg border ${
                  ['deposit', 'prize'].includes(t.type) ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-300 bg-slate-800 border-white/5'
                }`}>
                  {['deposit', 'prize'].includes(t.type) ? '+' : '-'} R$ {t.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
