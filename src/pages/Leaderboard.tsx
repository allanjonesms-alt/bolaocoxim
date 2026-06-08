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

  useEffect(() => {
    // We get all bets and sum points for each user.
    // In production with thousands of users, you'd maintain a `total_points` field on the user profile.
    const betsQuery = query(collection(db, 'bets'));
    const unsubscribeBets = onSnapshot(betsQuery, (snapshot) => {
      let totalAmount = 0;
      const scores: Record<string, { userName: string, points: number }> = {};
      
      snapshot.docs.forEach(doc => {
        const bet = doc.data();
        if (bet.status !== 'confirmed') return;
        totalAmount += bet.amount;
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
      
      setPrizePool(totalAmount * 0.02); // 2% of total bets
      setBoard(rows);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bets');
      setLoading(false);
    });

    return () => unsubscribeBets();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Carregando classificação...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-slate-900 border border-yellow-500/20 rounded-3xl p-10 text-white shadow-xl text-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px] pointer-events-none transition-all duration-700 group-hover:bg-yellow-500/20"></div>
        <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <Trophy className="absolute -right-8 -bottom-8 h-48 w-48 text-yellow-500/10 group-hover:text-yellow-500/20 transition-colors duration-700" />
        
        <div className="relative z-10">
          <h1 className="text-4xl font-display font-bold mb-3 tracking-tight flex justify-center items-center">
            Classificação <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 ml-3">Geral</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto mb-8 font-medium">
            Ganhador leva 2% de todas as apostas no final da competição!
          </p>
          <div className="inline-block bg-slate-950/80 backdrop-blur-md rounded-2xl px-8 py-5 font-mono text-2xl font-bold border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
            <span className="text-slate-500 text-sm uppercase tracking-widest block mb-1 font-sans">Prêmio Acumulado Rank 1</span>
            <span className="text-yellow-400 text-4xl">R$ {prizePool.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl shadow-xl border border-white/5 overflow-hidden relative">
         {/* Table glow accent */}
         <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-white/5 text-slate-400 text-sm font-semibold uppercase tracking-wider">
                <th className="py-5 px-6 w-20 text-center">Pos</th>
                <th className="py-5 px-6">Participante</th>
                <th className="py-5 px-6 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {board.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-500 font-medium">
                    Ainda não há pontuações registradas.
                  </td>
                </tr>
              ) : board.map((row, index) => (
                <tr key={row.userId} className={`transition-colors ${index === 0 ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : 'hover:bg-slate-800/50'}`}>
                  <td className="py-5 px-6 text-center">
                    {index === 0 ? <Crown className="h-7 w-7 text-yellow-400 mx-auto drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" /> : 
                     index === 1 ? <Medal className="h-6 w-6 text-slate-300 mx-auto" /> : 
                     index === 2 ? <Medal className="h-6 w-6 text-amber-600 mx-auto" /> : 
                     <span className="text-slate-500 font-mono font-bold text-lg">{index + 1}º</span>}
                  </td>
                  <td className="py-5 px-6 font-bold text-white text-lg">
                    {row.userName}
                    {index === 0 && <span className="ml-3 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-md border border-yellow-500/30 font-medium tracking-wide uppercase">Líder</span>}
                  </td>
                  <td className="py-5 px-6 text-right font-bold text-emerald-400 font-mono text-xl">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
