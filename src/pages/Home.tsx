import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Match } from '../types';
import { Trophy, CalendarClock, ChevronRight, CheckCircle2, Lock } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Carregando jogos...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Jogos da Copa <span className="text-emerald-400">2026</span></h1>
            <p className="text-slate-400 text-sm font-medium">Faça seus palpites e concorra aos prêmios acumulados.</p>
          </div>
          <Link 
            to="/leaderboard" 
            className="mt-6 sm:mt-0 flex items-center bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 px-5 py-2.5 rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(234,179,8,0.1)]"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Classificação Geral
          </Link>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="text-center bg-slate-900 p-12 rounded-3xl shadow-xl border border-white/5 flex flex-col items-center">
          <div className="bg-slate-800 p-4 rounded-full mb-4 border border-white/5">
            <CalendarClock className="h-8 w-8 text-slate-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-300">Nenhum jogo cadastrado ainda</h2>
          <p className="text-slate-500 text-sm mt-1">Volte mais tarde para conferir os próximos jogos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map(match => {
            const date = new Date(match.date);
            const isFinished = match.status === 'finished';
            const isOpen = match.status === 'open';

            return (
              <Link 
                key={match.id} 
                to={`/match/${match.id}`}
                className="group bg-slate-900 rounded-3xl border border-white/5 overflow-hidden hover:border-emerald-500/30 transition-all flex flex-col relative shadow-lg hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transform hover:-translate-y-1"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="bg-slate-950/50 px-5 py-3 border-b border-white/5 flex justify-between items-center text-sm relative z-10">
                  <span className="text-slate-400 font-medium tracking-wide text-xs">
                    {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {isOpen ? (
                    <span className="bg-emerald-500/10 text-emerald-400 font-bold px-2.5 py-1 rounded-md text-xs border border-emerald-500/20 flex items-center shadow-[0_0_10px_rgba(16,185,129,0.1)]">Aberto</span>
                  ) : isFinished ? (
                    <span className="bg-blue-500/10 text-blue-400 font-bold px-2.5 py-1 rounded-md text-xs flex items-center border border-blue-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1.5" /> Finalizado
                    </span>
                  ) : (
                    <span className="bg-orange-500/10 text-orange-400 font-bold px-2.5 py-1 rounded-md text-xs flex items-center border border-orange-500/20">
                      <Lock className="h-3 w-3 mr-1.5" /> Fechado
                    </span>
                  )}
                </div>
                
                <div className="p-8 flex-1 flex flex-col justify-center relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center space-y-3 w-1/3">
                      {match.flag1?.startsWith('http') || match.flag1?.startsWith('data:') ? (
                        <div className="relative">
                           <div className="absolute inset-0 bg-white/20 rounded-md blur"></div>
                           <img src={match.flag1} alt={match.team1} className="w-16 h-11 object-cover rounded-md shadow-lg border border-slate-700 relative z-10" />
                        </div>
                       ) : (
                        <span className="text-5xl drop-shadow-lg" title={match.team1}>{match.flag1}</span>
                      )}
                      <span className="font-bold text-white text-center text-sm">{match.team1}</span>
                    </div>
                    
                    <div className="w-1/3 flex flex-col items-center justify-center">
                      {isFinished ? (
                        <div className="bg-slate-950 border border-white/10 text-white px-5 py-2.5 rounded-xl font-display text-2xl font-bold flex space-x-2 shadow-inner">
                          <span>{match.result1}</span>
                          <span className="text-slate-600">-</span>
                          <span>{match.result2}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-bold text-sm tracking-widest uppercase">VS</span>
                      )}
                    </div>

                    <div className="flex flex-col items-center space-y-3 w-1/3">
                      {match.flag2?.startsWith('http') || match.flag2?.startsWith('data:') ? (
                         <div className="relative">
                            <div className="absolute inset-0 bg-white/20 rounded-md blur"></div>
                            <img src={match.flag2} alt={match.team2} className="w-16 h-11 object-cover rounded-md shadow-lg border border-slate-700 relative z-10" />
                         </div>
                       ) : (
                        <span className="text-5xl drop-shadow-lg" title={match.team2}>{match.flag2}</span>
                      )}
                      <span className="font-bold text-white text-center text-sm">{match.team2}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-950/50 px-5 py-4 border-t border-white/5 flex justify-between items-center transition relative z-10">
                  <div className="text-sm flex flex-col">
                    <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-0.5">Prêmio Acumulado</span>
                    <span className="font-bold text-emerald-400 font-mono text-base">
                      R$ {(match.poolTotal * 0.9).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-800 p-2 rounded-xl group-hover:bg-emerald-500/20 transition-colors border border-white/5 group-hover:border-emerald-500/30">
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  );
}
