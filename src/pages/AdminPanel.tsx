import { useState, useEffect, FormEvent } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, runTransaction, getDocs, where, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Match, Transaction, UserProfile, Bet } from '../types';

const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.8));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Trophy, Edit, Check, X, AlertTriangle, Clock } from 'lucide-react';

export default function AdminPanel() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [pendingBetAction, setPendingBetAction] = useState<{ type: 'approve' | 'reject'; bet: Bet } | null>(null);
  
  const [newMatchTeam1, setNewMatchTeam1] = useState('');
  const [newMatchTeam2, setNewMatchTeam2] = useState('');
  const [flagFile1, setFlagFile1] = useState<File | null>(null);
  const [flagFile2, setFlagFile2] = useState<File | null>(null);
  const [newMatchDate, setNewMatchDate] = useState('');
  const [uploadingMatch, setUploadingMatch] = useState(false);

  // Edit match state
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editTeam1, setEditTeam1] = useState('');
  const [editTeam2, setEditTeam2] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editFlagFile1, setEditFlagFile1] = useState<File | null>(null);
  const [editFlagFile2, setEditFlagFile2] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Custom alert/toast states
  const [pendingAction, setPendingAction] = useState<{ type: 'approve' | 'reject'; transaction: Transaction } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Selected user and user details modal states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedUserBets, setSelectedUserBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [adjustingBalance, setAdjustingBalance] = useState(false);

  const formatDateTime = (ts: any) => {
    if (!ts) return '-';
    let date: Date;
    if (typeof ts === 'string') {
      date = new Date(ts);
    } else if (ts && typeof ts.toDate === 'function') {
      date = ts.toDate();
    } else if (ts && ts.seconds) {
      date = new Date(ts.seconds * 1000);
    } else {
      date = new Date(ts);
    }
    
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOpenUserModal = async (u: UserProfile) => {
    setSelectedUser(u);
    setLoadingBets(true);
    try {
      const betsQuery = query(collection(db, 'bets'), where('userId', '==', u.id));
      const betsSnapshot = await getDocs(betsQuery);
      const fetchedBets = betsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
      
      fetchedBets.sort((a, b) => {
        const timeA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any).seconds ? (a.createdAt as any).seconds * 1000 : 0) : 0;
        const timeB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any).seconds ? (b.createdAt as any).seconds * 1000 : 0) : 0;
        return timeB - timeA;
      });
      setSelectedUserBets(fetchedBets);
    } catch (err) {
      console.error("Error fetching user bets:", err);
    } finally {
      setLoadingBets(false);
    }
  };

  const handleAdjustBalance = async (userId: string) => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification('Por favor, informe um valor válido maior que zero.', 'error');
      return;
    }

    setAdjustingBalance(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error("Usuário não encontrado.");
        }

        const currentBalance = userDoc.data().balance || 0;
        let newBalance = currentBalance;

        if (adjustmentType === 'deposit') {
          newBalance += amount;
        } else {
          if (currentBalance < amount) {
            throw new Error(`Saldo insuficiente. O usuário possui apenas R$ ${currentBalance.toFixed(2)}.`);
          }
          newBalance -= amount;
        }

        transaction.update(userRef, { balance: newBalance });

        const transRef = doc(collection(db, 'transactions'));
        transaction.set(transRef, {
          userId: userId,
          type: adjustmentType,
          amount: amount,
          status: 'confirmed',
          timestamp: serverTimestamp()
        });
      });

      showNotification('Saldo ajustado com sucesso!');
      setCustomAmount('');
    } catch (err: any) {
      showNotification(err.message || 'Erro ao ajustar o saldo.', 'error');
    } finally {
      setAdjustingBalance(false);
    }
  };

  useEffect(() => {
    const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      setMatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Match)));
    });
    const unsubTrans = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    });
    const unsubBets = onSnapshot(collection(db, 'bets'), (snapshot) => {
      setBets(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Bet)));
    });
    return () => { unsubMatches(); unsubTrans(); unsubUsers(); unsubBets(); };
  }, []);

  const handleAddMatch = async (e: FormEvent) => {
    e.preventDefault();
    setUploadingMatch(true);
    try {
      let flag1Url = '';
      let flag2Url = '';

      if (flagFile1) {
        flag1Url = await processImage(flagFile1);
      }
      if (flagFile2) {
        flag2Url = await processImage(flagFile2);
      }

      await addDoc(collection(db, 'matches'), {
        team1: newMatchTeam1,
        team2: newMatchTeam2,
        flag1: flag1Url,
        flag2: flag2Url,
        date: new Date(newMatchDate).toISOString(),
        status: 'open',
        poolTotal: 0
      });
      setNewMatchTeam1(''); setNewMatchTeam2(''); 
      setFlagFile1(null); setFlagFile2(null);
      setNewMatchDate('');
      showNotification('Partida adicionada com sucesso!');
    } catch(err) {
      handleFirestoreError(err, OperationType.CREATE, 'matches');
    } finally {
      setUploadingMatch(false);
    }
  }

  const startEditMatch = (m: Match) => {
    setEditingMatchId(m.id);
    setEditTeam1(m.team1);
    setEditTeam2(m.team2);
    // Format date for datetime-local input
    const d = new Date(m.date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setEditDate(d.toISOString().slice(0, 16));
    setEditFlagFile1(null);
    setEditFlagFile2(null);
  };

  const cancelEditMatch = () => {
    setEditingMatchId(null);
  };

  const handleSaveEdit = async (m: Match) => {
    setSavingEdit(true);
    try {
      let flag1Url = m.flag1;
      let flag2Url = m.flag2;

      if (editFlagFile1) {
        flag1Url = await processImage(editFlagFile1);
      }
      if (editFlagFile2) {
        flag2Url = await processImage(editFlagFile2);
      }

      await updateDoc(doc(db, 'matches', m.id), {
        team1: editTeam1,
        team2: editTeam2,
        date: new Date(editDate).toISOString(),
        flag1: flag1Url,
        flag2: flag2Url
      });
      
      setEditingMatchId(null);
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, 'matches');
    } finally {
      setSavingEdit(false);
    }
  };

  const executeApproveTransaction = async (t: Transaction) => {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', t.userId);
        const transRef = doc(db, 'transactions', t.id);
        
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("Usuário não encontrado.");
        
        const diff = t.type === 'deposit' ? t.amount : (t.type === 'withdrawal' ? -t.amount : 0);
        
        if (t.type === 'withdrawal' && userDoc.data().balance < t.amount) {
          throw new Error("Saldo insuficiente para saque.");
        }

        const newBalance = userDoc.data().balance + diff;
        transaction.update(userRef, { balance: newBalance });
        transaction.update(transRef, { status: 'confirmed' });

        if (t.type === 'deposit' && newBalance >= 5) {
          const pbets = await getDocs(query(collection(db, 'bets'), where('userId', '==', t.userId), where('status', '==', 'pending')));
          let currentBalance = newBalance;
          for (const pb of pbets.docs) {
            const betData = pb.data();
            const isAlreadyPaid = betData.paid;
            if (!isAlreadyPaid && currentBalance >= 5) {
               currentBalance -= 5;
               transaction.update(doc(db, 'bets', pb.id), { paid: true });
               transaction.update(userRef, { balance: currentBalance });

               // Record standard pending bet transaction
               const btransRef = doc(collection(db, 'transactions'));
               transaction.set(btransRef, {
                 userId: t.userId,
                 type: 'bet',
                 amount: 5,
                 status: 'pending',
                 timestamp: serverTimestamp()
               });
            }
          }
        }
      });
      showNotification('Transação aprovada com sucesso!');
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, 'transactions');
    }
  }

  const executeRejectTransaction = async (t: Transaction) => {
    try {
      await deleteDoc(doc(db, 'transactions', t.id));
      showNotification('Transação recusada e excluída com sucesso!');
    } catch(err) {
      handleFirestoreError(err, OperationType.DELETE, 'transactions');
    }
  }

  const executeApproveBet = async (b: Bet) => {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', b.userId);
        const matchRef = doc(db, 'matches', b.matchId);
        const betRef = doc(db, 'bets', b.id);

        const userDoc = await transaction.get(userRef);
        const matchDoc = await transaction.get(matchRef);
        const betDoc = await transaction.get(betRef);

        if (!userDoc.exists() || !matchDoc.exists() || !betDoc.exists()) {
          throw new Error("Documentos não encontrados.");
        }

        const isPaid = betDoc.data().paid;
        let finalPaid = isPaid;

        if (!isPaid) {
          const userBalance = userDoc.data().balance;
          if (userBalance < 5) {
            throw new Error("O usuário não possui saldo suficiente (R$ 5,00) para homologar esta aposta.");
          }
          transaction.update(userRef, { balance: userBalance - 5 });
          finalPaid = true;

          // Record a confirmed bet transaction
          const transRef = doc(collection(db, 'transactions'));
          transaction.set(transRef, {
            userId: b.userId,
            type: 'bet',
            amount: 5,
            status: 'confirmed',
            timestamp: serverTimestamp()
          });
        } else {
          // Confirm the pending transaction for this bet
          const pendingBetTrans = transactions.find(t => t.userId === b.userId && t.type === 'bet' && t.status === 'pending');
          if (pendingBetTrans) {
            transaction.update(doc(db, 'transactions', pendingBetTrans.id), { status: 'confirmed' });
          }
        }

        // Update bet status to confirmed
        transaction.update(betRef, { status: 'confirmed', paid: finalPaid });

        // Update match's poolTotal
        transaction.update(matchRef, { poolTotal: matchDoc.data().poolTotal + 5 });
      });

      showNotification('Aposta aprovada com sucesso!');
    } catch(err: any) {
      showNotification(err.message || 'Erro ao aprovar aposta.', 'error');
    }
  };

  const executeRejectBet = async (b: Bet) => {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', b.userId);
        const betRef = doc(db, 'bets', b.id);

        const userDoc = await transaction.get(userRef);
        const betDoc = await transaction.get(betRef);

        if (!betDoc.exists()) {
          throw new Error("Aposta não encontrada.");
        }

        const isPaid = betDoc.data().paid;

        if (isPaid && userDoc.exists()) {
          // Refund user balance
          const userBalance = userDoc.data().balance;
          transaction.update(userRef, { balance: userBalance + 5 });
        }

        // Delete the bet document
        transaction.delete(betRef);

        // Remove the pending transactions
        const pendingBetTrans = transactions.find(t => t.userId === b.userId && t.type === 'bet' && t.status === 'pending');
        if (pendingBetTrans) {
          transaction.delete(doc(db, 'transactions', pendingBetTrans.id));
        }
      });

      showNotification('Aposta recusada e removida com sucesso!');
    } catch(err: any) {
      showNotification(err.message || 'Erro ao rejeitar aposta.', 'error');
    }
  };

  const handleApproveTransaction = (t: Transaction) => {
    setPendingAction({ type: 'approve', transaction: t });
  }

  const handleRejectTransaction = (t: Transaction) => {
    setPendingAction({ type: 'reject', transaction: t });
  }

  const handleCloseEntries = async (id: string) => {
    try {
      await updateDoc(doc(db, 'matches', id), { status: 'betting_closed' });
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, 'matches');
    }
  }

  const handleFinalizeMatch = async (match: Match) => {
    const r1 = prompt(`Resultado: Gols de ${match.team1}`);
    const r2 = prompt(`Resultado: Gols de ${match.team2}`);
    if (r1 === null || r2 === null) return;
    
    const res1 = parseInt(r1, 10);
    const res2 = parseInt(r2, 10);
    if (isNaN(res1) || isNaN(res2)) return;

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
          
          const matchRealOutcome = res1 > res2 ? 1 : (res1 < res2 ? 2 : 0);
          const betOutcome = p1 > p2 ? 1 : (p1 < p2 ? 2 : 0);

          if (p1 === res1 && p2 === res2) {
            points = 5;
            isWinner = true;
          } else if (p1 === res1 || p2 === res2) {
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

        transaction.update(matchRef, { status: 'finished', result1: res1, result2: res2 });
        
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
      showNotification('Partida finalizada e prêmios distribuídos!');
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, 'matches');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
        <Trophy className="h-8 w-8 text-emerald-400" />
        Painel Administrativo
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Adicionar Partida */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none"></div>
          <div>
            <h2 className="font-display font-bold mb-6 text-white text-lg">Adicionar Partida</h2>
            <form onSubmit={handleAddMatch} className="space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row gap-4">
                <input type="text" placeholder="Time 1 (ex: Brasil)" value={newMatchTeam1} onChange={e=>setNewMatchTeam1(e.target.value)} required className="flex-1 w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-white text-sm" />
                <input type="file" accept=".jpg,.jpeg,.png" onChange={e=>setFlagFile1(e.target.files?.[0] || null)} required className="flex-1 px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 transition-all" title="Bandeira do Time 1" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <input type="text" placeholder="Time 2 (ex: Sérvia)" value={newMatchTeam2} onChange={e=>setNewMatchTeam2(e.target.value)} required className="flex-1 w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-white text-sm" />
                <input type="file" accept=".jpg,.jpeg,.png" onChange={e=>setFlagFile2(e.target.files?.[0] || null)} required className="flex-1 px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 transition-all" title="Bandeira do Time 2" />
              </div>
              <input type="datetime-local" value={newMatchDate} onChange={e=>setNewMatchDate(e.target.value)} required className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-white text-sm" />
              <button type="submit" disabled={uploadingMatch} className="w-full bg-emerald-500 text-slate-950 font-bold rounded-xl py-3 disabled:opacity-50 hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                {uploadingMatch ? 'Salvando...' : 'Salvar Partida'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Pending Transactions & Pending Bets */}
        <div className="space-y-8 flex flex-col">
          {/* TRANSAÇÕES PENDENTES */}
          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden flex-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[50px] pointer-events-none"></div>
            <h2 className="font-display font-bold mb-6 text-white text-lg">TRANSAÇÕES PENDENTES</h2>
            <div className="space-y-3 max-h-[220px] overflow-y-auto w-full pr-2 custom-scrollbar relative z-10">
              {transactions.filter(t => t.status === 'pending').length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhuma transação pendente.</p>
              ) : transactions.filter(t => t.status === 'pending').map(t => {
                const u = users.find(u => u.id === t.userId);
                const isDeposit = t.type === 'deposit';
                return (
                  <div key={t.id} className="bg-slate-950/50 border border-white/5 p-4 rounded-xl flex justify-between items-center text-sm">
                    <div>
                      <strong className="text-white block mb-1">{u?.name || 'User'}</strong>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDeposit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
                        {isDeposit ? 'Depósito' : 'Saque'}
                      </span>
                      <span className="ml-2 font-mono text-slate-300">R$ {t.amount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleApproveTransaction(t)} 
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3.5 py-2 rounded-lg font-medium transition-colors border border-emerald-500/20 text-xs sm:text-sm cursor-pointer"
                      >
                        Aprovar
                      </button>
                      <button 
                        onClick={() => handleRejectTransaction(t)} 
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3.5 py-2 rounded-lg font-medium transition-colors border border-red-500/20 text-xs sm:text-sm cursor-pointer"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* APOSTAS PENDENTES */}
          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden flex-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[50px] pointer-events-none"></div>
            <h2 className="font-display font-bold mb-6 text-white text-lg">APOSTAS PENDENTES</h2>
            <div className="space-y-3 max-h-[220px] overflow-y-auto w-full pr-2 custom-scrollbar relative z-10">
              {bets.filter(b => b.status === 'pending').length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhuma aposta pendente de aprovação.</p>
              ) : bets.filter(b => b.status === 'pending').map(b => {
                const u = users.find(u => u.id === b.userId);
                const m = matches.find(m => m.id === b.matchId);
                return (
                  <div key={b.id} className="bg-slate-950/50 border border-white/5 p-4 rounded-xl flex justify-between items-center text-sm">
                    <div>
                      <strong className="text-white block mb-0.5">{u?.name || b.userName}</strong>
                      <span className="text-xs text-slate-400 block mb-1">
                        Jogo: <span className="text-slate-300 font-bold">{m ? `${m.team1} x ${m.team2}` : 'Carregando...'}</span>
                      </span>
                      <span className="text-xs text-slate-400 block mb-1.5">
                        Palpite: <strong className="text-emerald-400 font-mono text-sm">{b.predicted1} x {b.predicted2}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${b.paid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                          {b.paid ? 'Pago (Debitado)' : 'Falta Saldo'}
                        </span>
                        <span className="font-mono text-slate-400 font-semibold text-xs">R$ {b.amount.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setPendingBetAction({ type: 'approve', bet: b })} 
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3.5 py-2 rounded-lg font-medium transition-colors border border-emerald-500/20 text-xs sm:text-sm cursor-pointer"
                      >
                        Aprovar
                      </button>
                      <button 
                        onClick={() => setPendingBetAction({ type: 'reject', bet: b })} 
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3.5 py-2 rounded-lg font-medium transition-colors border border-red-500/20 text-xs sm:text-sm cursor-pointer"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Usuários Cadastrados */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-white/5">
        <h2 className="font-display font-bold mb-6 text-white text-lg flex items-center gap-2">
          <span>Usuários Cadastrados</span>
          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono">
            {users.length}
          </span>
        </h2>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Celular</th>
                <th className="py-3 px-4">Saldo</th>
                <th className="py-3 px-4">Função</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">Nenhum usuário cadastrado.</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">{u.name}</td>
                    <td className="py-3.5 px-4 text-slate-400 select-all">{u.email}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{u.phone || '-'}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">R$ {(u.balance || 0).toFixed(2)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${u.role === 'admin' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-white/5'}`}>
                        {u.role === 'admin' ? 'Admin' : 'Usuário'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button 
                        onClick={() => handleOpenUserModal(u)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                      >
                        Ver Extrato & Palpites
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-white/5">
        <h2 className="font-display font-bold mb-6 text-white text-lg">Gerenciar Partidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map(m => (
            <div key={m.id} className="bg-slate-950 border border-white/5 p-5 rounded-xl flex flex-col justify-between shadow-sm relative">
              {editingMatchId === m.id ? (
                <div className="space-y-4 w-full">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-white text-sm">Editando Partida</span>
                    <button onClick={cancelEditMatch} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <input type="text" value={editTeam1} onChange={(e) => setEditTeam1(e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-emerald-500" placeholder="Time 1" />
                      <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setEditFlagFile1(e.target.files?.[0] || null)} className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-slate-300" title="Nova Bandeira 1" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <input type="text" value={editTeam2} onChange={(e) => setEditTeam2(e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-emerald-500" placeholder="Time 2" />
                      <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setEditFlagFile2(e.target.files?.[0] || null)} className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-slate-300" title="Nova Bandeira 2" />
                    </div>
                  </div>
                  <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-emerald-500" />
                  
                  <div className="flex justify-end pt-2">
                    <button onClick={() => handleSaveEdit(m)} disabled={savingEdit} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-1.5 rounded-lg font-bold text-sm disabled:opacity-50 transition-colors">
                      {savingEdit ? 'Salvando...' : <><Check className="w-4 h-4" /> Salvar</>}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-bold">{m.team1}</span>
                        {m.flag1?.startsWith('http') || m.flag1?.startsWith('data:') ? <img src={m.flag1} alt={m.team1} className="w-8 h-5 object-cover rounded-sm border border-white/10" /> : <span className="text-xl">{m.flag1}</span>}
                        <span className="text-slate-500 text-sm font-medium">vs</span>
                        {m.flag2?.startsWith('http') || m.flag2?.startsWith('data:') ? <img src={m.flag2} alt={m.team2} className="w-8 h-5 object-cover rounded-sm border border-white/10" /> : <span className="text-xl">{m.flag2}</span>}
                        <span className="text-white font-bold">{m.team2}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 font-medium">Status: <span className={m.status === 'open' ? 'text-emerald-400' : 'text-orange-400'}>{m.status.toUpperCase()}</span></p>
                      <p className="text-xs font-mono text-emerald-400 mt-1 bg-emerald-500/10 inline-block px-2 py-0.5 rounded border border-emerald-500/20">Pool: R$ {m.poolTotal.toFixed(2)}</p>
                    </div>
                    <button onClick={() => startEditMatch(m)} className="text-slate-400 hover:text-emerald-400 p-2 hover:bg-emerald-500/10 rounded-lg transition-colors group">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2 border-t border-white/5 pt-4 mt-auto">
                    {m.status === 'open' && (
                      <button onClick={() => handleCloseEntries(m.id)} className="flex-1 text-xs font-bold bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 px-3 py-2 rounded-lg transition-colors">Fechar Apostas</button>
                    )}
                    {(m.status === 'open' || m.status === 'betting_closed') && (
                      <button onClick={() => handleFinalizeMatch(m)} className="flex-1 text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 px-3 py-2 rounded-lg transition-colors">Informar Resultado</button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal Dossier de Detalhes do Usuário */}
      {selectedUser && (() => {
        const liveSelectedUser = users.find(u => u.id === selectedUser.id) || selectedUser;
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-150">
            <div className="bg-slate-900 rounded-3xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
              
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/20">
                <div>
                  <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                    <span>Dossiê de {liveSelectedUser.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold tracking-wider uppercase ${liveSelectedUser.role === 'admin' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      {liveSelectedUser.role === 'admin' ? 'Admin' : 'Jogador'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1 select-all">{liveSelectedUser.email}</p>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)} 
                  className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-full transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                
                {/* Resumo Financeiro */}
                <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1">Saldo Atual</span>
                    <span className="text-2xl font-bold font-mono text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-xl border border-emerald-500/20 inline-block">
                      R$ {(liveSelectedUser.balance || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:items-end gap-1.5 text-xs">
                    {liveSelectedUser.pix_key && (
                      <p className="text-slate-400 font-medium">
                        <strong className="text-slate-500 mr-1">Chave Pix:</strong> 
                        <span className="bg-slate-900 border border-white/5 px-2 py-0.5 rounded text-slate-300 select-all">{liveSelectedUser.pix_key}</span>
                      </p>
                    )}
                    {liveSelectedUser.phone && (
                      <p className="text-slate-400 font-medium">
                        <strong className="text-slate-500 mr-1">Celular:</strong> 
                        <span className="bg-slate-900 border border-white/5 px-1.5 py-0.5 rounded text-slate-300 font-mono select-all">{liveSelectedUser.phone}</span>
                      </p>
                    )}
                    <p className="text-slate-500 font-medium">
                      Conta cadastrada: {formatDateTime(liveSelectedUser.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Ajustar Saldo (Admin Balance Actions) */}
                <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-[40px] pointer-events-none"></div>
                  <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span>Ajustar Saldo do Usuário</span>
                  </h4>
                  <div className="flex flex-col sm:flex-row items-end gap-4 relative z-10">
                    <div className="flex-1 w-full space-y-2">
                      <label className="text-xs font-semibold text-slate-400">Tipo de Ajuste</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-1 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => setAdjustmentType('deposit')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            adjustmentType === 'deposit'
                              ? 'bg-emerald-500 text-slate-950 shadow-md'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          Adicionar (+ Depósito)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustmentType('withdrawal')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            adjustmentType === 'withdrawal'
                              ? 'bg-red-500 text-white shadow-md'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          Deduzir (- Saque)
                        </button>
                      </div>
                    </div>

                    <div className="w-full sm:w-48 space-y-2">
                      <label className="text-xs font-semibold text-slate-400">Valor (R$)</label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        placeholder="Ex: 50.00"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none text-white text-sm font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={adjustingBalance || !customAmount}
                      onClick={() => handleAdjustBalance(liveSelectedUser.id)}
                      className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer text-slate-950 ${
                        adjustmentType === 'deposit'
                          ? 'bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                          : 'bg-red-400 text-white hover:bg-red-350 hover:text-white'
                      }`}
                    >
                      {adjustingBalance ? 'Processando...' : 'Aplicar Ajuste'}
                    </button>
                  </div>
                </div>

                {/* Histórico / Extrato de Palpites Apostados */}
                <div>
                  <h4 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                    <span>Histórico de Palpites (Extrato de Apostas)</span>
                    <span className="bg-slate-850 text-slate-400 font-mono text-xs px-2 py-0.5 rounded-full border border-white/5">
                      {selectedUserBets.length}
                    </span>
                  </h4>

                  {loadingBets ? (
                    <div className="text-center py-12 text-slate-500">
                      <span className="inline-block animate-spin border-2 border-emerald-400 border-t-transparent w-6 h-6 rounded-full mb-3 animate-pulse"></span>
                      <p className="text-sm">Carregando apostas do usuário...</p>
                    </div>
                  ) : selectedUserBets.length === 0 ? (
                    <p className="text-sm text-slate-500 font-medium text-center py-12 bg-slate-950/20 border border-dashed border-white/5 rounded-2xl">
                      Este usuário ainda não realizou nenhuma aposta.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {selectedUserBets.map(bet => {
                        const match = matches.find(m => m.id === bet.matchId);
                        const isFinished = match?.status === 'finished';
                        const isWinner = bet.is_winner || bet.points !== undefined && bet.points > 0 && bet.is_winner;
                        
                        let pointsLabel = '';
                        let pointsClass = 'text-slate-400 bg-slate-800/50 border-white/5';
                        if (isFinished && bet.points !== undefined) {
                          if (bet.points === 5) {
                            pointsLabel = 'Placar Exato (+5 pts)';
                            pointsClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                          } else if (bet.points === 3) {
                            pointsLabel = 'Gols de 1 Time (+3 pts)';
                            pointsClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                          } else if (bet.points === 1) {
                            pointsLabel = 'Vencedor do Jogo (+1 pt)';
                            pointsClass = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
                          } else {
                            pointsLabel = 'Sem Pontuação (0 pts)';
                            pointsClass = 'text-red-400 bg-red-500/10 border-red-500/20';
                          }
                        }

                        return (
                          <div key={bet.id} className="bg-slate-950/50 border border-white/5 hover:border-white/10 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
                            <div className="space-y-2 flex-1">
                              {/* Match details & Teams */}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                                {match ? (
                                  <>
                                    <span className="text-white font-bold text-sm tracking-wide">{match.team1}</span>
                                    {match.flag1?.startsWith('http') || match.flag1?.startsWith('data:') ? (
                                      <img src={match.flag1} alt={match.team1} className="w-5 h-3.5 object-cover rounded-sm inline-block border border-white/10" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-lg">{match.flag1}</span>
                                    )}
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">vs</span>
                                    {match.flag2?.startsWith('http') || match.flag2?.startsWith('data:') ? (
                                      <img src={match.flag2} alt={match.team2} className="w-5 h-3.5 object-cover rounded-sm inline-block border border-white/10" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-lg">{match.flag2}</span>
                                    )}
                                    <span className="text-white font-bold text-sm tracking-wide">{match.team2}</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-500 font-medium italic animate-pulse">Carregando partida ({bet.matchId})...</span>
                                )}
                              </div>

                              {/* Bet value and predict details */}
                              <div className="flex flex-wrap items-center gap-3 text-xs">
                                <div className="text-slate-300 font-medium">
                                  Palpite: <span className="text-emerald-400 font-bold font-mono text-sm bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">{bet.predicted1} x {bet.predicted2}</span>
                                </div>
                                <span className="text-slate-600">|</span>
                                <div className="text-slate-400">
                                  Valor Apostado: <span className="font-mono text-slate-200">R$ {bet.amount.toFixed(2)}</span>
                                </div>
                                
                                {/* Date and Time details */}
                                <span className="text-slate-600">|</span>
                                <div className="text-slate-500 font-medium">
                                  Apostado em: <span className="font-mono text-slate-400">{formatDateTime(bet.createdAt)}</span>
                                </div>
                              </div>

                              {/* Real Match Outcome context */}
                              {isFinished && match && (
                                <div className="text-xs text-slate-400 font-medium">
                                  Resultado Real: <span className="text-white font-bold font-mono bg-slate-900 border border-white/5 px-2 py-0.5 rounded">{match.result1} x {match.result2}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex sm:flex-row md:flex-col items-end gap-2 shrink-0 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                              {/* Bet status badge */}
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${bet.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                {bet.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
                              </span>

                              {/* Prize and Points details if finished */}
                              {isFinished && (
                                <div className="flex flex-row md:flex-col gap-2 items-center md:items-end w-full md:w-auto justify-between md:justify-start">
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${pointsClass}`}>
                                    {pointsLabel}
                                  </span>
                                  {bet.prize_collected !== undefined && bet.prize_collected > 0 && (
                                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-right">
                                      Prêmio: +R$ {bet.prize_collected.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex justify-end bg-slate-950/20">
                <button 
                  onClick={() => setSelectedUser(null)} 
                  className="bg-slate-800 hover:bg-slate-700 text-white border border-white/5 rounded-xl px-5 py-2.5 font-bold text-sm transition-colors cursor-pointer"
                >
                  Fechar Dossiê
                </button>
              </div>

            </div>
          </div>
        );
      })()}
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] bg-slate-900 border border-white/10 shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-fade-in-down max-w-sm">
          <div className={`p-2 rounded-xl ${toast.type === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            {toast.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notificação</p>
            <p className="text-sm font-bold text-white mt-0.5">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer" title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Transaction Action Confirmation Modal */}
      {pendingAction && (() => {
        const t = pendingAction.transaction;
        const u = users.find(user => user.id === t.userId);
        const isApprove = pendingAction.type === 'approve';
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-slate-900 rounded-3xl border border-white/10 w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative">
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/20">
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${isApprove ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span>Confirmar Ação</span>
                </h3>
                <button 
                  onClick={() => setPendingAction(null)} 
                  className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                  Deseja realmente <strong className={isApprove ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                    {isApprove ? 'APROVAR' : 'RECUSAR E EXCLUIR'}
                  </strong> o {t.type === 'deposit' ? 'depósito' : 'saque'} de <span className="font-mono text-white font-bold">R$ {t.amount.toFixed(2)}</span> solicitado por <strong className="text-slate-200">{u?.name || 'Jogador'}</strong>?
                </p>
                {!isApprove && (
                  <p className="text-xs text-red-400/80 font-medium bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                    Aviso: Recusar esta transação irá deletá-la definitivamente de todos os históricos!
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-slate-950/20">
                <button 
                  onClick={() => setPendingAction(null)} 
                  className="bg-slate-800 hover:bg-slate-700 text-slate-350 border border-white/5 rounded-xl px-4 py-2.5 font-bold text-xs transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    const actionItem = pendingAction;
                    setPendingAction(null);
                    if (actionItem.type === 'approve') {
                      await executeApproveTransaction(actionItem.transaction);
                    } else {
                      await executeRejectTransaction(actionItem.transaction);
                    }
                  }} 
                  className={`rounded-xl px-4 py-2.5 font-bold text-xs transition-colors cursor-pointer uppercase tracking-wider text-slate-950 shadow-md ${
                    isApprove ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-500 hover:bg-red-400 text-white'
                  }`}
                >
                  {isApprove ? 'Sim, Aprovar' : 'Sim, Recusar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bet Action Confirmation Modal */}
      {pendingBetAction && (() => {
        const b = pendingBetAction.bet;
        const u = users.find(user => user.id === b.userId);
        const m = matches.find(match => match.id === b.matchId);
        const isApprove = pendingBetAction.type === 'approve';
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-slate-900 rounded-3xl border border-white/10 w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative">
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/20">
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${isApprove ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span>Confirmar Aposta</span>
                </h3>
                <button 
                  onClick={() => setPendingBetAction(null)} 
                  className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                  Deseja realmente <strong className={isApprove ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                    {isApprove ? 'APROVAR' : 'RECUSAR E DELETAR'}
                  </strong> o palpite de <strong className="text-white font-bold">{b.predicted1} x {b.predicted2}</strong> para a partida <strong className="text-slate-200">{m ? `${m.team1} x ${m.team2}` : 'Carregando...'}</strong> realizado por <strong className="text-slate-200">{u?.name || b.userName}</strong>?
                </p>
                
                <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1">
                  <div>Status de Pagamento: <strong className={b.paid ? "text-emerald-400 font-mono" : "text-red-400 font-mono"}>{b.paid ? "Pago (Debitado)" : "Falta Saldo (Pagará do saldo atual)"}</strong></div>
                  <div>Valor da Aposta: <strong className="text-white font-mono">R$ {b.amount.toFixed(2)}</strong></div>
                </div>

                {!isApprove && (
                  <p className="text-xs text-red-400/80 font-medium bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                    Aviso: Recusar esta aposta irá deletá-la definitivamente. Caso ela estivesse paga, os R$ 5,00 serão reembolsados ao saldo do usuário!
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-slate-950/20">
                <button 
                  onClick={() => setPendingBetAction(null)} 
                  className="bg-slate-800 hover:bg-slate-700 text-slate-350 border border-white/5 rounded-xl px-4 py-2.5 font-bold text-xs transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    const actionItem = pendingBetAction;
                    setPendingBetAction(null);
                    if (actionItem.type === 'approve') {
                      await executeApproveBet(actionItem.bet);
                    } else {
                      await executeRejectBet(actionItem.bet);
                    }
                  }} 
                  className={`rounded-xl px-4 py-2.5 font-bold text-xs transition-colors cursor-pointer uppercase tracking-wider text-slate-950 shadow-md ${
                    isApprove ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-500 hover:bg-red-400 text-white'
                  }`}
                >
                  {isApprove ? 'Sim, Aprovar' : 'Sim, Recusar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
