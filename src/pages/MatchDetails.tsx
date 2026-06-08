import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Match, Bet } from '../types';
import { CheckCircle2, DollarSign, Clock, Lock } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function MatchDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [predict1, setPredict1] = useState<string>('');
  const [predict2, setPredict2] = useState<string>('');
  const [placingBet, setPlacingBet] = useState(false);
  const [betError, setBetError] = useState('');

  useEffect(() => {
    if (!id) return;
    
    const unsubMatch = onSnapshot(doc(db, 'matches', id), (docSnap) => {
      if (docSnap.exists()) {
        setMatch({ id: docSnap.id, ...docSnap.data() } as Match);
      } else {
        setMatch(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'matches'));
    
    const qBets = query(collection(db, 'bets'), where('matchId', '==', id));
    const unsubBets = onSnapshot(qBets, (snapshot) => {
      const betsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Bet));
      setBets(betsData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bets'));
    
    return () => {
      unsubMatch();
      unsubBets();
    };
  }, [id]);

  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user || !match || placingBet) return;
    
    const p1 = parseInt(predict1, 10);
    const p2 = parseInt(predict2, 10);
    if (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0) {
      setBetError('Placar inválido.');
      return;
    }
    
    setBetError('');
    setPlacingBet(true);
    
    try {
      // Check for existing pending bet
      const pendingBets = bets.filter(b => b.userId === user.uid && b.status === 'pending');
      
      const hasBalance = profile.balance >= 5;
      if (!hasBalance && pendingBets.length > 0) {
        setBetError('Você já possui uma aposta pendente por falta de saldo neste jogo. Adicione saldo para confirmar.');
        setPlacingBet(false);
        return;
      }

      const betAmount = 5;

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const matchRef = doc(db, 'matches', match.id);
        
        const userDoc = await transaction.get(userRef);
        const matchDoc = await transaction.get(matchRef);
        
        if (!userDoc.exists() || !matchDoc.exists()) throw new Error('Documento não encontrado.');
        
        if (matchDoc.data().status !== 'open') {
          throw new Error('Apostas encerradas para esta partida.');
        }

        const actualBalance = userDoc.data().balance;
        const canPay = actualBalance >= betAmount;

        if (canPay) {
          transaction.update(userRef, { balance: actualBalance - betAmount });
          
          // Record transaction
          const transRef = doc(collection(db, 'transactions'));
          transaction.set(transRef, {
            userId: user.uid,
            type: 'bet',
            amount: betAmount,
            status: 'pending', // Awaiting admin approval of the bet
            timestamp: serverTimestamp()
          });
        }
        
        // Add bet - under the new rules, it starts as 'pending' always, waiting for direct admin action
        const betRef = doc(collection(db, 'bets'));
        transaction.set(betRef, {
          userId: user.uid,
          userName: profile.name,
          matchId: match.id,
          predicted1: p1,
          predicted2: p2,
          amount: betAmount,
          status: 'pending',
          paid: canPay,
          createdAt: serverTimestamp()
        });
      });
      
      setPredict1('');
      setPredict2('');
      if (hasBalance) {
        alert('Sua aposta foi registrada com sucesso e aguarda homologação do administrador.');
      } else {
        alert('Sua aposta foi registrada como PENDENTE pois você não possui saldo suficiente (R$ 5,00). Adicione créditos no seu painel para confirmar automaticamente.');
      }

    } catch (err: any) {
      setBetError(err.message || 'Erro ao realizar aposta.');
      console.error(err);
    } finally {
      setPlacingBet(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Carregando detalhes...</div>;
  if (!match) return <div className="p-12 text-center text-red-500 font-bold hover:text-red-400">Partida não encontrada.</div>;

  const date = new Date(match.date);
  
  // Group bets by score
  const groupedBets: Record<string, Bet[]> = {};
  bets.forEach(b => {
    // Hide other users' pending bets
    if (b.status !== 'confirmed' && b.userId !== user?.uid) {
      return;
    }
    const key = `${b.predicted1}x${b.predicted2}`;
    if (!groupedBets[key]) groupedBets[key] = [];
    groupedBets[key].push(b);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Match Header */}
      <div className="bg-slate-900 rounded-3xl shadow-xl border border-white/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="bg-slate-950/50 px-8 py-5 border-b border-white/5 flex justify-between items-center text-sm relative z-10 transition-colors">
          <span className="text-slate-400 font-semibold tracking-wide text-xs">
            {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={`font-bold px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider border flex items-center ${
            match.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' :
            match.status === 'finished' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
          }`}>
            {match.status === 'open' ? 'Aberto para apostas' : 
             match.status === 'finished' ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Finalizado</> : 
             <><Lock className="h-3.5 w-3.5 mr-1.5" /> Apostas Fechadas</>}
          </span>
        </div>
        
        <div className="p-10 relative z-10">
          <div className="flex items-center justify-center space-x-12">
            <div className="flex flex-col items-center space-y-5 w-1/3">
              {match.flag1?.startsWith('http') || match.flag1?.startsWith('data:') ? (
                 <div className="relative">
                    <div className="absolute inset-0 bg-white/20 rounded-xl blur-md"></div>
                    <img src={match.flag1} alt={match.team1} className="w-32 h-20 object-cover rounded-xl shadow-2xl border-2 border-slate-700 relative z-10" />
                 </div>
              ) : (
                <span className="text-7xl drop-shadow-2xl">{match.flag1}</span>
              )}
              <span className="font-display font-bold text-2xl text-white text-center tracking-tight">{match.team1}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center w-1/3">
              {match.status === 'finished' ? (
                <div className="bg-slate-950 border border-white/10 text-white px-8 py-4 rounded-2xl font-display text-5xl font-bold flex space-x-5 shadow-inner">
                  <span>{match.result1}</span>
                  <span className="text-slate-600">-</span>
                  <span>{match.result2}</span>
                </div>
              ) : (
                <span className="text-slate-600 font-bold text-4xl tracking-widest uppercase">VS</span>
              )}
            </div>

            <div className="flex flex-col items-center space-y-5 w-1/3">
              {match.flag2?.startsWith('http') || match.flag2?.startsWith('data:') ? (
                 <div className="relative">
                   <div className="absolute inset-0 bg-white/20 rounded-xl blur-md"></div>
                   <img src={match.flag2} alt={match.team2} className="w-32 h-20 object-cover rounded-xl shadow-2xl border-2 border-slate-700 relative z-10" />
                 </div>
              ) : (
                <span className="text-7xl drop-shadow-2xl">{match.flag2}</span>
              )}
              <span className="font-display font-bold text-2xl text-white text-center tracking-tight">{match.team2}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-emerald-500/10 px-6 py-5 border-t border-emerald-500/20 flex justify-center items-center relative z-10 font-medium">
          {/* <DollarSign className="h-5 w-5 text-emerald-400 mr-2" /> */}
          <span className="text-slate-300 text-sm uppercase tracking-wider mr-3">Prêmio Acumulado P/ Vencedores:</span>
          <span className="font-bold text-emerald-400 font-mono text-2xl drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            R$ {(match.poolTotal * 0.9).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Betting Form */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-3xl shadow-xl border border-white/5 p-8 sticky top-24">
            <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center pb-4 border-b border-white/5">Fazer Aposta <span className="text-emerald-400 ml-2 font-mono text-lg">(R$ 5,00)</span></h2>
            
            {match.status !== 'open' ? (
              <div className="bg-slate-950/50 text-slate-500 font-medium p-6 rounded-2xl text-center text-sm border border-white/5 flex flex-col items-center mb-2">
                <Lock className="h-6 w-6 text-slate-600 mb-2" />
                Apostas encerradas para este jogo.
              </div>
            ) : (
              <form onSubmit={handlePlaceBet} className="space-y-6">
                {betError && (
                  <div className="bg-red-500/10 text-red-400 font-semibold p-4 rounded-xl text-sm border border-red-500/20 text-center">
                    {betError}
                  </div>
                )}
                
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 truncate text-center">{match.team1}</label>
                    <input 
                      type="number" 
                      min="0"
                      required
                      className="w-full text-center px-4 py-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 font-mono text-3xl font-bold text-white outline-none transition-shadow"
                      value={predict1}
                      onChange={e => setPredict1(e.target.value)}
                    />
                  </div>
                  <span className="text-slate-600 font-bold mt-6 text-xl">X</span>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 truncate text-center">{match.team2}</label>
                    <input 
                      type="number" 
                      min="0"
                      required
                      className="w-full text-center px-4 py-4 bg-slate-950 border border-white/10 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 font-mono text-3xl font-bold text-white outline-none transition-shadow"
                      value={predict2}
                      onChange={e => setPredict2(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={placingBet}
                  className="w-full bg-emerald-500 text-slate-950 font-bold py-4 rounded-2xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.2)] text-lg"
                >
                  {placingBet ? 'Processando...' : 'Confirmar Aposta'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Existing Bets */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 rounded-3xl shadow-xl border border-white/5 p-8">
            <h2 className="text-xl font-display font-bold text-white mb-6 pb-4 border-b border-white/5 flex items-center justify-between">
              Placares Apostados
              <span className="bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full font-mono">{bets.filter(b => b.status === 'confirmed' || b.userId === user?.uid).length} Palpites</span>
            </h2>
            
            {Object.keys(groupedBets).length === 0 ? (
              <div className="text-slate-500 font-medium text-center py-12">Nenhuma aposta registrada ainda. Seja o primeiro!</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar max-h-[600px] overflow-y-auto pr-2">
                {Object.entries(groupedBets).map(([score, groupBets]) => {
                  const numConfirmed = groupBets.filter(b => b.status === 'confirmed').length;
                  const currentPrizePerPerson = numConfirmed > 0 ? ((match.poolTotal * 0.9) / numConfirmed).toFixed(2) : '0.00';
                  
                  return (
                    <div key={score} className="bg-slate-950/50 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
                      <div className="bg-slate-900 px-5 py-4 flex justify-between items-center border-b border-white/5">
                        <div className="font-mono text-2xl font-bold text-white">
                          {score.replace('x', ' - ')}
                        </div>
                        <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex flex-col items-end">
                           <span className="text-[10px] text-emerald-500/70 uppercase">Retorno</span>
                          R$ {currentPrizePerPerson}
                        </div>
                      </div>
                      <div className="p-4 flex flex-wrap gap-2">
                        {groupBets.map(bet => (
                           <div key={bet.id} className={`text-xs px-2.5 py-1.5 rounded-md flex items-center space-x-2 border transition-colors ${bet.userId === user?.uid ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-white/5'}`}>
                             {bet.status === 'confirmed' ? (
                               <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${bet.userId === user?.uid ? 'text-emerald-400' : 'text-emerald-500/50'}`} />
                             ) : (
                               <Clock className="h-3.5 w-3.5 text-orange-500/75 shrink-0" title="Aposta Pendente" />
                             )}
                             <span className={`font-medium ${bet.userId === user?.uid ? 'text-white' : 'text-slate-400'}`}>
                               {bet.userName} {bet.userId === user?.uid ? '(Você)' : ''} {bet.status === 'pending' ? <span className="text-orange-400 text-[10px] font-bold uppercase ml-1">(Pendente)</span> : ''}
                             </span>
                           </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
