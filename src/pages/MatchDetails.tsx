import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, runTransaction, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Match, Bet } from '../types';
import { CheckCircle2, DollarSign, Clock, Lock, User, Radio, Save, Edit3, AlertTriangle, Trophy } from 'lucide-react';
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

  const [live1, setLive1] = useState<number>(0);
  const [live2, setLive2] = useState<number>(0);
  const [savingLive, setSavingLive] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (match) {
      setLive1(match.liveResult1 ?? 0);
      setLive2(match.liveResult2 ?? 0);
    }
  }, [match?.liveResult1, match?.liveResult2]);

  const handleAdjustLiveScore = (team: 1 | 2, adjustment: number) => {
    if (team === 1) {
      setLive1(prev => Math.max(0, prev + adjustment));
    } else {
      setLive2(prev => Math.max(0, prev + adjustment));
    }
  };

  const handleSaveLiveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || savingLive) return;
    setSavingLive(true);
    try {
      await updateDoc(doc(db, 'matches', match.id), {
        liveResult1: live1,
        liveResult2: live2
      });
      alert('Placar ao vivo salvo com sucesso!');
    } catch (err: any) {
      console.error('Error saving live score:', err);
      alert('Erro ao salvar placar: ' + err.message);
    } finally {
      setSavingLive(false);
    }
  };

  const handleFinalizeMatch = async () => {
    if (!match || finalizing) return;
    setFinalizing(true);
    try {
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'matches', match.id);
        
        const betsQuery = query(collection(db, 'bets'), where('matchId', '==', match.id), where('status', '==', 'confirmed'));
        const betsDocs = await getDocs(betsQuery);
        
        const winners: any[] = [];
        const updateBets: { ref: any, points: number, isWinner: boolean }[] = [];
        
        betsDocs.forEach(b => {
          const p1 = b.data().predicted1;
          const p2 = b.data().predicted2;
          
          let points = 0;
          let isWinner = false;
          
          const matchRealOutcome = live1 > live2 ? 1 : (live1 < live2 ? 2 : 0);
          const betOutcome = p1 > p2 ? 1 : (p1 < p2 ? 2 : 0);

          if (p1 === live1 && p2 === live2) {
            points = 5;
            isWinner = true;
          } else if (p1 === live1 || p2 === live2) {
            points = 3;
          } else if (matchRealOutcome === betOutcome) {
            points = 1;
          }

          if (isWinner) {
            winners.push(b);
          }
          updateBets.push({ ref: doc(db, 'bets', b.id), points, isWinner });
        });

        const prizePool = match.poolTotal * 0.9;
        const prizePerWinner = winners.length > 0 ? prizePool / winners.length : 0;

        transaction.update(matchRef, { 
          status: 'finished', 
          result1: live1, 
          result2: live2,
          liveResult1: live1,
          liveResult2: live2
        });
        
        for (const up of updateBets) {
           transaction.update(up.ref, { 
             points: up.points, 
             is_winner: up.isWinner,
             prize_collected: up.isWinner ? prizePerWinner : 0
           });
        }
        
        if (winners.length > 0) {
          const userPrizes: Record<string, number> = {};
          winners.forEach(w => {
            const uid = w.data().userId;
            userPrizes[uid] = (userPrizes[uid] || 0) + prizePerWinner;
          });
          
          for (const uid in userPrizes) {
            const uRef = doc(db, 'users', uid);
            const uDoc = await transaction.get(uRef);
            if (uDoc.exists()) {
               transaction.update(uRef, { balance: uDoc.data().balance + userPrizes[uid] });
               
               const tRef = doc(collection(db, 'transactions'));
               transaction.set(tRef, {
                 userId: uid,
                 type: 'prize',
                 amount: userPrizes[uid],
                 status: 'confirmed',
                 timestamp: serverTimestamp()
               });
            }
          }
        }
      });
      setShowConfirmEnd(false);
      alert('Partida finalizada e prêmios distribuídos com sucesso!');
    } catch (err: any) {
      console.error('Error finalizing match:', err);
      alert('Erro ao finalizar partida: ' + err.message);
    } finally {
      setFinalizing(false);
    }
  };

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
    
    // Check if the current time is less than 30 minutes before match start
    const matchDate = new Date(match.date);
    if (matchDate.getTime() - Date.now() < 30 * 60 * 1000) {
      setBetError('As apostas só são válidas se confirmadas até 30 minutos antes do início da partida.');
      return;
    }
    
    setBetError('');
    setPlacingBet(true);
    
    try {
      if (match.isPromotional) {
        const userBets = bets.filter(b => b.userId === user.uid);
        if (userBets.length >= 3) {
          setBetError('Você atingiu o limite de 3 apostas para jogos promocionais.');
          setPlacingBet(false);
          return;
        }
      }

      // Check for existing pending bet
      const pendingBets = bets.filter(b => b.userId === user.uid && b.status === 'pending');
      
      const betAmount = match.isPromotional ? 1 : 5;
      const hasBalance = profile.balance >= betAmount;
      if (!hasBalance && pendingBets.length > 0) {
        setBetError('Você já possui uma aposta pendente por falta de saldo neste jogo. Adicione saldo para confirmar.');
        setPlacingBet(false);
        return;
      }

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
            status: 'confirmed', // Automatically confirmed because bet is paid
            timestamp: serverTimestamp()
          });

          // Update poolTotal in match
          // If promotional, 50% goes to general pool, but since it doesn't give prizes we can just add to poolTotal to track total money moved or ignore. We'll add it.
          // Wait, actually, let's keep track of poolTotal = same thing.
          transaction.update(matchRef, { poolTotal: matchDoc.data().poolTotal + betAmount });
        }
        
        // Add bet
        const betRef = doc(collection(db, 'bets'));
        transaction.set(betRef, {
          userId: user.uid,
          userName: profile.name,
          matchId: match.id,
          predicted1: p1,
          predicted2: p2,
          amount: betAmount,
          status: canPay ? 'confirmed' : 'pending',
          paid: canPay,
          createdAt: serverTimestamp()
        });
      });
      
      setPredict1('');
      setPredict2('');
      if (hasBalance) {
        alert('Sua aposta foi registrada com sucesso e aprovada automaticamente pelo sistema.');
      } else {
        alert(`Sua aposta foi registrada como PENDENTE pois você não possui saldo suficiente (R$ ${betAmount.toFixed(2)}). Adicione créditos no seu painel para ser homologada.`);
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

  const sortedScores = Object.keys(groupedBets).sort((a, b) => {
    const [a1, a2] = a.split('x').map(Number);
    const [b1, b2] = b.split('x').map(Number);
    
    const brazilIsTeam2 = match.team2.toLowerCase() === 'brasil' || match.team2.toLowerCase() === 'brazil';
    
    let aBraGoals = a1;
    let aOppGoals = a2;
    let bBraGoals = b1;
    let bOppGoals = b2;
    
    if (brazilIsTeam2) {
      aBraGoals = a2;
      aOppGoals = a1;
      bBraGoals = b2;
      bOppGoals = b1;
    }
    
    const getOutcome = (bra: number, opp: number) => {
      if (bra > opp) return 1; // Win
      if (bra === opp) return 0; // Draw
      return -1; // Loss
    };
    
    const aOut = getOutcome(aBraGoals, aOppGoals);
    const bOut = getOutcome(bBraGoals, bOppGoals);
    
    if (aOut !== bOut) {
      return bOut - aOut; // Win > Draw > Loss
    }
    
    if (aOut === 1) { // Both wins
      if (bBraGoals !== aBraGoals) {
         return bBraGoals - aBraGoals;
      }
      return aOppGoals - bOppGoals;
    }
    
    if (aOut === 0) { // Both draws
      return bBraGoals - aBraGoals;
    }
    
    if (aOut === -1) { // Both losses
      if (aOppGoals !== bOppGoals) {
        return aOppGoals - bOppGoals;
      }
      return bBraGoals - aBraGoals;
    }
    
    return 0;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Match Header */}
      <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center text-sm relative z-10 transition-colors">
          <span className="text-slate-500 font-semibold tracking-wide text-xs">
            {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={`font-bold px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider border flex items-center ${
            match.status === 'open' && (new Date(match.date).getTime() - Date.now() >= 30 * 60 * 1000) ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
            match.status === 'finished' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-105'
          }`}>
            {match.status === 'open' && (new Date(match.date).getTime() - Date.now() >= 30 * 60 * 1000) ? 'Aberto para apostas' : 
             match.status === 'finished' ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Finalizado</> : 
             <><Lock className="h-3.5 w-3.5 mr-1.5" /> Apostas Fechadas</>}
          </span>
        </div>
        
        <div className="p-10 relative z-10">
          <div className="flex items-center justify-center space-x-12">
            <div className="flex flex-col items-center space-y-5 w-1/3">
              {match.flag1?.startsWith('http') || match.flag1?.startsWith('data:') ? (
                 <div className="relative">
                    <div className="absolute inset-0 bg-slate-200 rounded-xl blur-md"></div>
                    <img src={match.flag1} alt={match.team1} className="w-32 h-20 object-cover rounded-xl shadow-md border-2 border-slate-100 relative z-10" />
                 </div>
              ) : (
                <span className="text-7xl drop-shadow-md">{match.flag1}</span>
              )}
              <span className="font-display font-bold text-2xl text-slate-800 text-center tracking-tight">{match.team1}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center w-1/3">
              {match.status === 'finished' ? (
                <div className="bg-slate-50 border border-slate-200 text-slate-800 px-8 py-4 rounded-2xl font-display text-5xl font-bold flex space-x-5 shadow-inner">
                  <span>{match.result1}</span>
                  <span className="text-slate-400">-</span>
                  <span>{match.result2}</span>
                </div>
              ) : (new Date(match.date).getTime() <= Date.now()) ? (
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-[10px] bg-red-50 text-red-600 px-3 py-1 rounded-full font-black uppercase tracking-wider animate-pulse flex items-center gap-1.5 border border-red-105">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-600 inline-block animate-ping"></span>
                    Ao Vivo
                  </span>
                  <div className="bg-red-650 text-white px-7 py-3 rounded-2xl font-display text-4xl font-extrabold flex space-x-4 shadow-lg shadow-red-500/20">
                    <span>{match.liveResult1 ?? 0}</span>
                    <span className="text-red-205 opacity-80 animate-pulse">:</span>
                    <span>{match.liveResult2 ?? 0}</span>
                  </div>
                </div>
              ) : (
                <span className="text-slate-400 font-bold text-4xl tracking-widest uppercase">VS</span>
              )}
            </div>

            <div className="flex flex-col items-center space-y-5 w-1/3">
              {match.flag2?.startsWith('http') || match.flag2?.startsWith('data:') ? (
                 <div className="relative">
                   <div className="absolute inset-0 bg-slate-200 rounded-xl blur-md"></div>
                   <img src={match.flag2} alt={match.team2} className="w-32 h-20 object-cover rounded-xl shadow-md border-2 border-slate-100 relative z-10" />
                 </div>
              ) : (
                <span className="text-7xl drop-shadow-md">{match.flag2}</span>
              )}
              <span className="font-display font-bold text-2xl text-slate-800 text-center tracking-tight">{match.team2}</span>
            </div>
          </div>
        </div>
        
        {match.isPromotional ? (
          <div className="bg-indigo-50/65 px-6 py-5 border-t border-indigo-100 flex justify-center items-center relative z-10 font-semibold text-indigo-900">
            <span className="text-indigo-500 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
              🌟 Jogo Promocional - Ganhe pontos para a Classificação Geral
            </span>
          </div>
        ) : (
          <div className="bg-emerald-55/65 px-6 py-5 border-t border-emerald-100 flex justify-center items-center relative z-10 font-semibold text-emerald-900">
            <span className="text-slate-500 text-xs uppercase tracking-wider mr-3">Prêmio Acumulado P/ Vencedores:</span>
            <span className="font-extrabold text-emerald-700 font-mono text-2xl">
              R$ {(match.poolTotal * 0.9).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {profile?.role === 'admin' && match.status !== 'finished' && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-yellow-400/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-400/10 rounded-full blur-[60px] pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-display font-black text-yellow-400 flex items-center gap-2">
                <Edit3 className="h-5 w-5 shrink-0" />
                PAINEL DO ADMINISTRADOR: CONTROLE EM TEMPO REAL
              </h2>
              <p className="text-slate-350 text-xs font-semibold mt-0.5">
                Atualize o placar em tempo real ou encerre definitivamente a partida para consolidar resultados.
              </p>
            </div>
            <span className="bg-red-500 text-white font-mono text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white inline-block animate-ping"></span>
              Modo Ao Vivo
            </span>
          </div>

          {showConfirmEnd ? (
            <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-6 space-y-4 animate-fade-in relative z-20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-base text-red-200">CONFIRMAR ENCERRAMENTO DA PARTIDA</h3>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1">
                    Você está prestes a encerrar oficialmente a partida com o placar final de:
                  </p>
                  <div className="inline-flex items-center gap-3 bg-red-500/20 px-4 py-2 rounded-xl mt-3 border border-red-500/30">
                    <span className="font-bold text-sm text-white">{match.team1}</span>
                    <span className="font-mono text-xl font-extrabold text-red-400">{live1} : {live2}</span>
                    <span className="font-bold text-sm text-white">{match.team2}</span>
                  </div>
                  <p className="text-[11px] text-red-400/90 font-semibold mt-3">
                    ⚠️ ATENÇÃO: Esta ação é definitiva e irreversível! Todos os palpites serão avaliados,
                    os pontos computados no ranking, e os ganhadores receberão sua parte proporcional do prêmio de <strong className="text-white">R$ {(match.poolTotal * 0.9).toFixed(2)}</strong>.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirmEnd(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Continuar Partida
                </button>
                <button
                  type="button"
                  onClick={handleFinalizeMatch}
                  disabled={finalizing}
                  className="px-6 py-2.5 rounded-xl bg-red-650 hover:bg-red-550 text-xs font-black text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10 disabled:opacity-50 animate-pulse"
                >
                  {finalizing ? 'Processando...' : 'Confirmar Encerramento e Distribuir Prêmios'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveLiveScore} className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 flex items-center justify-center gap-8 w-full">
                {/* Team 1 Adjuster */}
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-xs text-slate-300 font-bold tracking-wide truncate max-w-[120px]">{match.team1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdjustLiveScore(1, -1)}
                      className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xl font-bold flex items-center justify-center border border-slate-700 transition"
                    >
                      -
                    </button>
                    <span className="font-mono text-4xl font-extrabold w-12 text-center text-white">{live1}</span>
                    <button
                      type="button"
                      onClick={() => handleAdjustLiveScore(1, 1)}
                      className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xl font-bold flex items-center justify-center border border-emerald-500 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* VS Divider */}
                <span className="text-slate-500 font-black text-xl self-center pt-5">x</span>

                {/* Team 2 Adjuster */}
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-xs text-slate-300 font-bold tracking-wide truncate max-w-[120px]">{match.team2}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdjustLiveScore(2, -1)}
                      className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xl font-bold flex items-center justify-center border border-slate-700 transition"
                    >
                      -
                    </button>
                    <span className="font-mono text-4xl font-extrabold w-12 text-center text-white">{live2}</span>
                    <button
                      type="button"
                      onClick={() => handleAdjustLiveScore(2, 1)}
                      className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xl font-bold flex items-center justify-center border border-emerald-500 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full md:w-auto shrink-0 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={savingLive}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-250 border border-slate-700 font-bold px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition"
                >
                  <Save className="h-4 w-4" />
                  {savingLive ? 'Salvando...' : 'Salvar Placar'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmEnd(true)}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition shadow-md shadow-red-500/20"
                >
                  <Trophy className="h-4 w-4" />
                  Encerrar Partida
                </button>
                
                <Link
                  to="/admin"
                  className="w-full sm:w-auto bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-semibold px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition border border-slate-800/80"
                >
                  Controle Geral
                </Link>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Betting Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 sticky top-24">
            <h2 className="text-xl font-display font-bold text-slate-800 mb-6 flex items-center pb-4 border-b border-slate-100">
              Fazer Aposta 
              <span className={`${match.isPromotional ? 'text-indigo-600' : 'text-emerald-600'} ml-2 font-mono text-lg`}>
                (R$ {match.isPromotional ? '1,00' : '5,00'})
              </span>
            </h2>
            
            {match.status !== 'open' || (new Date(match.date).getTime() - Date.now() < 30 * 60 * 1000) ? (
              <div className="bg-slate-50 text-slate-400 font-medium p-6 rounded-2xl text-center text-sm border border-slate-100 flex flex-col items-center mb-2">
                <Lock className="h-6 w-6 text-slate-350 mb-2" />
                Apostas encerradas para este jogo.
              </div>
            ) : !user ? (
              <div className="bg-slate-55 border border-slate-200/80 text-slate-600 font-medium p-6 sm:p-7 rounded-2xl text-center text-sm flex flex-col items-center">
                <div className="bg-yellow-450/10 p-3 rounded-full mb-3 text-emerald-800">
                  <User className="h-6 w-6" />
                </div>
                <p className="mb-4 text-slate-500 font-medium leading-relaxed">Você precisa estar conectado para palpitar neste jogo.</p>
                <Link 
                  to="/login" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-xl transition duration-150 inline-flex items-center justify-center text-sm"
                >
                  Entrar / Criar Conta
                </Link>
              </div>
            ) : match.isPromotional && bets.filter(b => b.userId === user.uid).length >= 3 ? (
              <div className="bg-indigo-50 border border-indigo-200 text-slate-700 font-medium p-6 sm:p-7 rounded-2xl text-center text-sm flex flex-col items-center gap-3 animate-fade-in">
                <div className="bg-indigo-100 p-3 rounded-full text-indigo-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="font-bold text-base text-slate-800">Limite de Apostas Atingido</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Você já registrou os 3 palpites permitidos para esta partida promocional.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePlaceBet} className="space-y-6">
                {betError && (
                  <div className="bg-red-50 text-red-605 font-bold p-4 rounded-xl text-sm border border-red-100 text-center">
                    {betError}
                  </div>
                )}
                
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 truncate text-center">{match.team1}</label>
                    <input 
                      type="number" 
                      min="0"
                      required
                      className="w-full text-center px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/35 focus:border-emerald-600 font-mono text-3xl font-bold text-slate-800 outline-none transition-all"
                      value={predict1}
                      onChange={e => setPredict1(e.target.value)}
                    />
                  </div>
                  <span className="text-slate-400 font-bold mt-6 text-xl">X</span>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 truncate text-center">{match.team2}</label>
                    <input 
                      type="number" 
                      min="0"
                      required
                      className="w-full text-center px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/35 focus:border-emerald-600 font-mono text-3xl font-bold text-slate-800 outline-none transition-all"
                      value={predict2}
                      onChange={e => setPredict2(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={placingBet}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/10 text-lg cursor-pointer"
                >
                  {placingBet ? 'Processando...' : 'Confirmar Aposta'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Existing Bets */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8">
            <h2 className="text-xl font-display font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              Placares Apostados
              <span className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full font-mono font-bold">{bets.filter(b => b.status === 'confirmed' || b.userId === user?.uid).length} Palpites</span>
            </h2>
            
            {Object.keys(groupedBets).length === 0 ? (
              <div className="text-slate-400 font-medium text-center py-12">Nenhuma aposta registrada ainda. Seja o primeiro!</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar max-h-[600px] overflow-y-auto pr-2">
                {sortedScores.map(score => {
                  const groupBets = groupedBets[score];
                  const numConfirmed = groupBets.filter(b => b.status === 'confirmed').length;
                  const currentPrizePerPerson = numConfirmed > 0 ? ((match.poolTotal * 0.9) / numConfirmed).toFixed(2) : '0.00';
                  
                  const [pred1, pred2] = score.split('x').map(Number);
                  const isStarted = new Date(match.date).getTime() <= Date.now();
                  const isImpossible = isStarted && match.status !== 'finished' && (
                    pred1 < (match.liveResult1 ?? 0) || pred2 < (match.liveResult2 ?? 0)
                  );
                  const isWinning = isStarted && match.status !== 'finished' && (
                    pred1 === (match.liveResult1 ?? 0) && pred2 === (match.liveResult2 ?? 0)
                  );
                  
                  return (
                    <div 
                      key={score} 
                      className={`border rounded-2xl overflow-hidden shadow-sm hover:shadow transition-all ${
                        isImpossible 
                          ? 'bg-slate-100/60 border-slate-205/50 opacity-40 grayscale pointer-events-none' 
                          : isWinning
                            ? 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-white border-emerald-500 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500 ring-offset-2 animate-pulse'
                            : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className={`px-5 py-3.5 flex justify-between items-center border-b transition-colors ${
                        isWinning 
                          ? 'bg-emerald-500/20 border-emerald-500/30' 
                          : 'bg-slate-100/75 border-slate-200/50'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          {match.flag1?.startsWith('http') || match.flag1?.startsWith('data:') ? (
                            <img src={match.flag1} alt={match.team1} className="w-8 h-5 object-cover rounded-sm shadow-sm" />
                          ) : (
                            <span className="text-xl">{match.flag1}</span>
                          )}
                          <div className={`font-mono text-2xl font-bold ${
                            isImpossible 
                              ? 'text-slate-450 line-through' 
                              : isWinning 
                                ? 'text-emerald-700 font-extrabold scale-105 transition-transform' 
                                : 'text-slate-800'
                          }`}>
                            {score.replace('x', ' - ')}
                          </div>
                          {match.flag2?.startsWith('http') || match.flag2?.startsWith('data:') ? (
                            <img src={match.flag2} alt={match.team2} className="w-8 h-5 object-cover rounded-sm shadow-sm" />
                          ) : (
                            <span className="text-xl">{match.flag2}</span>
                          )}

                          {isStarted && match.status !== 'finished' && (
                            <div className="ml-1 shrink-0">
                              {isImpossible ? (
                                <span className="text-[8px] bg-red-105 text-red-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-red-200">
                                  Inviável
                                </span>
                              ) : isWinning ? (
                                <span className="text-[9px] bg-emerald-600 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-wider border border-emerald-700 shadow-sm animate-bounce inline-flex items-center gap-1">
                                  🎯 Acertando!
                                </span>
                              ) : (
                                <span className="text-[8px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-emerald-200 animate-pulse">
                                  Vivo
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {isImpossible ? (
                          <div className="text-[10px] font-bold text-slate-500 bg-slate-200/60 border border-slate-300 px-2.5 py-1 rounded-md flex flex-col items-end">
                            <span className="text-[8px] text-slate-450 uppercase font-black">Resultado</span>
                            Eliminado
                          </div>
                        ) : isWinning ? (
                          <div className="text-xs font-black text-white bg-emerald-600 border border-emerald-700 px-3 py-1.5 rounded-lg flex flex-col items-end shadow-sm animate-pulse">
                            <span className="text-[9px] text-emerald-100 uppercase font-bold mb-0.5">{match.isPromotional ? 'Pontos' : 'Retorno'}</span>
                            {match.isPromotional ? '+ Pontos' : `R$ ${currentPrizePerPerson}`}
                          </div>
                        ) : !match.isPromotional ? (
                          <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg flex flex-col items-end">
                             <span className="text-[9px] text-emerald-500/75 uppercase font-bold mb-0.5">Retorno</span>
                            R$ {currentPrizePerPerson}
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg flex flex-col items-end">
                             <span className="text-[9px] text-indigo-500/75 uppercase font-bold mb-0.5">PONTOS DE LIGA</span>
                             + Pontos
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-wrap gap-2">
                        {groupBets.map(bet => (
                           <div 
                             key={bet.id} 
                             className={`text-xs px-2.5 py-1.5 rounded-md flex items-center space-x-2 border transition-colors ${
                               isWinning
                                 ? bet.userId === user?.uid 
                                   ? 'bg-emerald-650 text-white border-emerald-700 font-semibold' 
                                   : 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                                 : bet.userId === user?.uid 
                                   ? 'bg-emerald-50 border-emerald-200' 
                                   : 'bg-white border-slate-200/60'
                             }`}
                           >
                             {bet.status === 'confirmed' ? (
                               <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${
                                 isWinning
                                   ? bet.userId === user?.uid ? 'text-white' : 'text-emerald-600'
                                   : bet.userId === user?.uid ? 'text-emerald-600' : 'text-emerald-400'
                               }`} />
                             ) : (
                               <Clock className="h-3.5 w-3.5 text-orange-500 shrink-0" title="Aposta Pendente" />
                             )}
                             <span className={`font-semibold ${
                               isWinning 
                                 ? bet.userId === user?.uid ? 'text-white font-extrabold' : 'text-emerald-950'
                                 : bet.userId === user?.uid ? 'text-emerald-950 font-bold' : 'text-slate-650'
                             }`}>
                               {bet.userName} {bet.userId === user?.uid ? '(Você)' : ''} {bet.status === 'pending' ? <span className="text-orange-500 text-[10px] font-bold uppercase ml-1">(Pendente)</span> : ''}
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
