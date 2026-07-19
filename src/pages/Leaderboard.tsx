import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, Medal, Crown } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { LEADERBOARD_PRIZE_MULTIPLIER } from '../utils/constants';
import { Bet } from '../types';

// Users point aggregations
interface LeaderboardRow {
  userId: string;
  userName: string;
  points: number;
}

export default function Leaderboard() {
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prizePool, setPrizePool] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const matchesQuery = query(collection(db, 'matches'));
    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
      const matchData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatches(matchData);
    });

    const fetchLeaderboardData = async () => {
      try {
        const betsQuery = query(collection(db, 'bets'), where('status', '==', 'confirmed'));
        const snapshot = await getDocs(betsQuery);
        const allBets: any[] = [];
        const scores: Record<string, { userName: string, points: number }> = {};
        
        snapshot.docs.forEach(doc => {
          const betData = doc.data() as Bet;
          const bet = { ...betData, id: doc.id };
          allBets.push(bet);

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
        
        setBets(allBets);
        setBoard(rows);
        setError(null);
        setLoading(false);
      } catch (error: any) {
        console.error("Error loading leaderboard:", error);
        setError(error.message || "Erro ao carregar a classificação.");
        setLoading(false);
        try {
          handleFirestoreError(error, OperationType.LIST, 'bets');
        } catch (e) {
          console.error("Mapped Firestore Error:", e);
        }
      }
    };

    fetchLeaderboardData();

    return () => {
      unsubscribeMatches();
    };
  }, []);

  useEffect(() => {
    if (matches.length === 0 || bets.length === 0) return;
    
    let calculatedPrizePool = 0;
    bets.forEach(bet => {
      if (bet.status !== 'confirmed') return;
      const match = matches.find(m => m.id === bet.matchId);
      if (match?.isPromotional) {
        calculatedPrizePool += (bet.amount || 2) * 0.50;
      } else {
        calculatedPrizePool += (bet.amount || 5) * 0.02;
      }
    });
    setPrizePool(calculatedPrizePool);
  }, [bets, matches]);

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
                    <td className="py-5 px-6 text-right font-mono text-lg">
                      <div className="flex items-center justify-end gap-3">
                        <span className="font-extrabold text-emerald-600">{row.points} pts</span>
                        {index === 0 && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-lg whitespace-nowrap shadow-sm" title="Prêmio Estimado (70%)">
                            Est. R$ {(prizePool * LEADERBOARD_PRIZE_MULTIPLIER * 0.7).toFixed(2)}
                          </span>
                        )}
                        {index === 1 && (
                          <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg whitespace-nowrap shadow-sm" title="Prêmio Estimado (20%)">
                            Est. R$ {(prizePool * LEADERBOARD_PRIZE_MULTIPLIER * 0.2).toFixed(2)}
                          </span>
                        )}
                        {index === 2 && (
                          <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded-lg whitespace-nowrap shadow-sm" title="Prêmio Estimado (10%)">
                            Est. R$ {(prizePool * LEADERBOARD_PRIZE_MULTIPLIER * 0.1).toFixed(2)}
                          </span>
                        )}
                      </div>
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
