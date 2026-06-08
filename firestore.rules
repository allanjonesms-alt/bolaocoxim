import { useState, useEffect, FormEvent } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, runTransaction, getDocs, where } from 'firebase/firestore';
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
import { Trophy, Edit, Check, X } from 'lucide-react';

export default function AdminPanel() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
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
    return () => { unsubMatches(); unsubTrans(); unsubUsers(); };
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
      alert('Partida adicionada.');
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

  const handleApproveTransaction = async (t: Transaction) => {
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
            if (currentBalance >= 5) {
               currentBalance -= 5;
               transaction.update(doc(db, 'bets', pb.id), { status: 'confirmed' });
               transaction.update(userRef, { balance: currentBalance });
               
               const matchRef = doc(db, 'matches', pb.data().matchId);
               const matchDoc = await transaction.get(matchRef);
               transaction.update(matchRef, { poolTotal: matchDoc.data().poolTotal + 5 });
            }
          }
        }
      });
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, 'transactions');
    }
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
      alert('Partida finalizada e prêmios distribuídos!');
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
        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none"></div>
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

        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[50px] pointer-events-none"></div>
          <h2 className="font-display font-bold mb-6 text-white text-lg">Aprovar Transações</h2>
          <div className="space-y-3 max-h-[250px] overflow-y-auto w-full pr-2 custom-scrollbar relative z-10">
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
                  <div>
                    <button onClick={() => handleApproveTransaction(t)} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-500/20">
                      Aprovar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
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
    </div>
  );
}
