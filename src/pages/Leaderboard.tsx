import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, Medal, Crown } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

// Users point aggregations
interface LeaderboardRow {
  userId: string;
  userName: string;
  points: number;
}

export default function Leaderboard() {
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [prizePool, setPrizePool] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We get all bets and sum points for each user.
    // In production with thousands of users, you'd maintain a `total_points` field on the user profile.
    const betsQuery = query(collection(db, 'bets'));
    const unsubscribeBets = onSnapshot(betsQuery, (snapshot) => {
      let calculatedPrizePool = 0;
      const scores: Record<string, { userName: string, points: number }> = {};
      
      snapshot.docs.forEach(doc => {
        const bet = doc.data();
        if (bet.status !== 'confirmed') return;
        
        if (bet.amount === 1) {
          calculatedPrizePool += bet.amount * 0.50;
        } else {
          calculatedPrizePool += bet.amount * 0.02;
        }

        if (!scores[bet.userId]) {
          scores[bet.userId] = { userName: bet.userName, points: 0 };
        }
        scores[bet.userId].points += (bet.points || 0);
      });
      
      const rows = Object.keys(scores).map(userId => ({
        userId,
        userName: scores[userId].userName,
        points: scores[userId].points
      })).sort((a, b) => b.points - a.points);
      
      setPrizePool(calculatedPrizePool);
      setBoard(rows);
      setError(null);
      setLoading(false);
    }, (error) => {
      console.error("Error loading leaderboard:", error);
      setError(error.message || "Erro ao carregar a classificação.");
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.LIST, 'bets');
      } catch (e) {
        console.error("Mapped Firestore Error:", e);
      }
    });

    return () => unsubscribeBets();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Carregando classificação...</div>;
  }

  if (error) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto bg-white rounded-3xl border border-red-100 shadow-sm mt-8">
        <div className="text-red-500 font-bold mb-2">Ops! Ocorreu um erro</div>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 border border-yellow-400/30 rounded-3xl p-10 text-white shadow-xl text-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-[80px] pointer-events-none transition-all duration-700 group-hover:bg-yellow-400/20"></div>
        <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <Trophy className="absolute -right-8 -bottom-8 h-48 w-48 text-yellow-400/10 group-hover:text-yellow-400/20 transition-colors duration-700" />
        
        <div className="relative z-10">
          <h1 className="text-4xl font-display font-bold mb-3 tracking-tight flex justify-center items-center">
            Classificação <span className="text-yellow-400 ml-3">Geral</span>
          </h1>
          <div className="inline-flex flex-col bg-emerald-950/70 backdrop-blur-md rounded-2xl px-8 py-5 font-mono text-2xl font-bold border border-yellow-400/30 shadow-inner items-center mt-6">
            <span className="text-emerald-200/60 text-xs uppercase tracking-widest block mb-1 font-sans">Prêmio Acumulado Rank 1</span>
            <span className="text-yellow-400 text-4xl">R$ {prizePool.toFixed(2)}</span>
            <div className="mt-4 pt-4 border-t border-emerald-800/50 w-full text-center">
              <span className="text-emerald-300 text-[10px] uppercase tracking-widest block mb-1 font-sans">Prêmio Estimado*</span>
              <span className="text-emerald-400 text-xl font-black">R$ {(prizePool * 7).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden relative">
         {/* Table glow accent */}
         <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent"></div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-5 px-6 w-20 text-center">Pos</th>
                <th className="py-5 px-6">Participante</th>
                <th className="py-5 px-6 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {board.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400 font-medium">
                    Ainda não há pontuações registradas.
                  </td>
                </tr>
              ) : (
                board.map((row, index) => (
                  <tr key={row.userId} className={`transition-colors ${index === 0 ? 'bg-yellow-50/60 hover:bg-yellow-50' : 'hover:bg-slate-50/50'}`}>
                    <td className="py-5 px-6 text-center">
                      {index === 0 ? <Crown className="h-7 w-7 text-yellow-500 mx-auto drop-shadow-sm" /> : 
                       index === 1 ? <Medal className="h-6 w-6 text-slate-400 mx-auto" /> : 
                       index === 2 ? <Medal className="h-6 w-6 text-amber-600 mx-auto" /> : 
                       <span className="text-slate-400 font-mono font-extrabold text-sm">{index + 1}º</span>}
                    </td>
                    <td className="py-5 px-6 font-bold text-slate-800 text-base">
                      {row.userName}
                      {index === 0 && <span className="ml-3 text-[10px] bg-yellow-100 text-amber-800 px-2.5 py-1 rounded-md border border-yellow-200 font-bold tracking-wide uppercase">Líder</span>}
                    </td>
                    <td className="py-5 px-6 text-right font-extrabold text-emerald-600 font-mono text-lg">
                      {row.points}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
