import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Match } from '../types';
import { Trophy, CalendarClock, ChevronRight, CheckCircle2, Lock } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import MatchCountdown from '../components/MatchCountdown';

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchData);
      setError(null);
      setLoading(false);
    }, (error) => {
      console.error("Error listing matches:", error);
      setError(error.message || "Erro ao carregar os jogos.");
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.LIST, 'matches');
      } catch (e) {
        console.error("Mapped Firestore Error:", e);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Carregando jogos...</div>;
  }

  if (error) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto bg-white rounded-3xl border border-red-100 shadow-sm">
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

  const urgentPromotionalMatches = matches.filter(match => {
    if (!match.isPromotional || match.status !== 'open') return false;
    const matchDate = new Date(match.date).getTime();
    const closingTime = matchDate - 30 * 60 * 1000;
    const timeLeft = closingTime - now;
    return timeLeft > 0 && timeLeft <= 3 * 60 * 60 * 1000;
  });

  const normalPromotionalMatches = matches.filter(match => {
    if (!match.isPromotional) return false;
    if (match.status === 'open') {
      const matchDate = new Date(match.date).getTime();
      const closingTime = matchDate - 30 * 60 * 1000;
      const timeLeft = closingTime - now;
      if (timeLeft > 0 && timeLeft <= 3 * 60 * 60 * 1000) return false;
    }
    return true;
  });

  const officialMatches = matches.filter(match => !match.isPromotional);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-emerald-800 to-emerald-950 p-6 sm:p-8 rounded-3xl shadow-lg border border-yellow-400/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Jogos da Copa <span className="text-yellow-400">2026</span></h1>
            <p className="text-emerald-100/80 text-sm font-medium">Faça seus palpites e concorra aos prêmios acumulados.</p>
          </div>
          <Link 
            to="/leaderboard" 
            className="mt-6 sm:mt-0 flex items-center bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-5 py-2.5 rounded-xl font-extrabold transition-colors shadow-md"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Classificação Geral
          </Link>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="text-center bg-white p-12 rounded-3xl shadow-md border border-slate-200 flex flex-col items-center">
          <div className="bg-slate-50 p-4 rounded-full mb-4 border border-slate-100">
            <CalendarClock className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Nenhum jogo cadastrado ainda</h2>
          <p className="text-slate-500 text-sm mt-1">Volte mais tarde para conferir os próximos jogos.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Sessão de Jogos Promocionais em Destaque (Urgentes - < 3h de expiração) */}
          {urgentPromotionalMatches.length > 0 && (
            <div className="bg-indigo-50/40 border border-indigo-200 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h2 className="text-xl font-display font-bold text-red-600 flex items-center gap-2">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
                    </span>
                    🚨 DESTAQUE: ÚLTIMAS HORAS PARA PALPITAR!
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Estes jogos promocionais se encerram em menos de 3 horas! Faça já seus palpites por apenas R$ 1,00.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {urgentPromotionalMatches.map(match => {
                  const date = new Date(match.date);
                  const isFinished = match.status === 'finished';
                  const isOpen = match.status === 'open' && (date.getTime() - Date.now() >= 30 * 60 * 1000);

                  return (
                    <Link 
                      key={match.id} 
                      to={`/match/${match.id}`}
                      className="group bg-gradient-to-b from-indigo-100/50 via-white to-white rounded-3xl border-2 border-red-500/70 overflow-hidden hover:border-indigo-500 hover:shadow-lg transition-all flex flex-col relative transform hover:-translate-y-1"
                    >
                      <div className="absolute top-0 right-0 bg-red-600 text-white font-mono text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider relative z-20 shadow-sm animate-pulse">
                        Última Chance
                      </div>
                      
                      <div className="bg-indigo-50/80 px-5 py-3 border-b border-indigo-100 flex justify-between items-center text-sm relative z-10">
                        <div className="flex flex-col items-start pr-14">
                          <span className="text-indigo-600/80 font-bold tracking-wide text-xs">
                            {date.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })} às {date.toLocaleTimeString('pt-BR', { timeZone: 'America/Manaus', hour: '2-digit', minute: '2-digit' })} (UTC -4:00)
                          </span>
                          <MatchCountdown matchDate={match.date} isOpen={isOpen} />
                        </div>
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col justify-center relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col items-center space-y-3 w-1/3">
                            {match.flag1?.startsWith('http') || match.flag1?.startsWith('data:') ? (
                              <div className="relative">
                                 <div className="absolute inset-0 bg-slate-200 rounded-md blur"></div>
                                 <img src={match.flag1} alt={match.team1} className="w-16 h-11 object-cover rounded-md shadow-md border border-slate-100 relative z-10" />
                              </div>
                             ) : (
                              <span className="text-5xl drop-shadow-md" title={match.team1}>{match.flag1}</span>
                            )}
                            <span className="font-bold text-slate-800 text-center text-sm">{match.team1}</span>
                          </div>
                          
                          <div className="w-1/3 flex flex-col items-center justify-center">
                            <span className="text-red-500 font-extrabold text-sm tracking-widest uppercase animate-pulse">VS</span>
                          </div>

                          <div className="flex flex-col items-center space-y-3 w-1/3">
                            {match.flag2?.startsWith('http') || match.flag2?.startsWith('data:') ? (
                               <div className="relative">
                                  <div className="absolute inset-0 bg-slate-200 rounded-md blur"></div>
                                  <img src={match.flag2} alt={match.team2} className="w-16 h-11 object-cover rounded-md shadow-md border border-slate-100 relative z-10" />
                               </div>
                             ) : (
                              <span className="text-5xl drop-shadow-md" title={match.team2}>{match.flag2}</span>
                            )}
                            <span className="font-bold text-slate-800 text-center text-sm">{match.team2}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-red-50/30 px-5 py-4 border-t border-red-100/50 flex justify-between items-center transition relative z-10">
                        <div className="text-sm flex flex-col">
                          <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Pontos p/ Classificação</span>
                          <span className="font-bold text-indigo-600 text-sm">
                            Até 5 pts
                          </span>
                        </div>
                        <div className="text-sm flex flex-col items-end">
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Custo Aposta</span>
                          <span className="font-bold text-red-600 font-mono text-base">
                            R$ 1.00
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {officialMatches.length > 0 && (
            <div>
              <h2 className="text-xl font-display font-bold text-slate-800 mb-6 flex items-center border-b border-slate-200 pb-3">
                Jogos Oficiais 
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {officialMatches.map(match => {
                  const date = new Date(match.date);
                  const isFinished = match.status === 'finished';
                  const isOpen = match.status === 'open' && (date.getTime() - Date.now() >= 30 * 60 * 1000);

                  return (
                    <Link 
                      key={match.id} 
                      to={`/match/${match.id}`}
                      className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-emerald-600 transition-all flex flex-col relative shadow-sm hover:shadow-md transform hover:-translate-y-1"
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/0 via-emerald-500/0 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex justify-between items-center text-sm relative z-10">
                        <div className="flex flex-col items-start">
                          <span className="text-slate-500 font-semibold tracking-wide text-xs">
                            {date.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })} às {date.toLocaleTimeString('pt-BR', { timeZone: 'America/Manaus', hour: '2-digit', minute: '2-digit' })} (UTC -4:00)
                          </span>
                          <MatchCountdown matchDate={match.date} isOpen={isOpen} />
                        </div>
                        
                        {isOpen ? (
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-md text-xs border border-emerald-100 flex items-center">Aberto</span>
                        ) : isFinished ? (
                          <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-md text-xs flex items-center border border-blue-100">
                            <CheckCircle2 className="h-3 w-3 mr-1.5" /> Finalizado
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 font-bold px-2.5 py-1 rounded-md text-xs flex items-center border border-amber-100">
                            <Lock className="h-3 w-3 mr-1.5" /> Fechado
                          </span>
                        )}
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col justify-center relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col items-center space-y-3 w-1/3">
                            {match.flag1?.startsWith('http') || match.flag1?.startsWith('data:') ? (
                              <div className="relative">
                                 <div className="absolute inset-0 bg-slate-200 rounded-md blur"></div>
                                 <img src={match.flag1} alt={match.team1} className="w-16 h-11 object-cover rounded-md shadow-md border border-slate-100 relative z-10" />
                              </div>
                             ) : (
                              <span className="text-5xl drop-shadow-md" title={match.team1}>{match.flag1}</span>
                            )}
                            <span className="font-bold text-slate-800 text-center text-sm">{match.team1}</span>
                          </div>
                          
                          <div className="w-1/3 flex flex-col items-center justify-center">
                            {isFinished ? (
                              <div className="bg-slate-100 border border-slate-200 text-slate-800 px-5 py-2.5 rounded-xl font-display text-2xl font-bold flex space-x-2 shadow-inner">
                                <span>{match.result1}</span>
                                <span className="text-slate-400">-</span>
                                <span>{match.result2}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-bold text-sm tracking-widest uppercase">VS</span>
                            )}
                          </div>

                          <div className="flex flex-col items-center space-y-3 w-1/3">
                            {match.flag2?.startsWith('http') || match.flag2?.startsWith('data:') ? (
                               <div className="relative">
                                  <div className="absolute inset-0 bg-slate-200 rounded-md blur"></div>
                                  <img src={match.flag2} alt={match.team2} className="w-16 h-11 object-cover rounded-md shadow-md border border-slate-100 relative z-10" />
                               </div>
                             ) : (
                              <span className="text-5xl drop-shadow-md" title={match.team2}>{match.flag2}</span>
                            )}
                            <span className="font-bold text-slate-800 text-center text-sm">{match.team2}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50/80 px-5 py-4 border-t border-slate-100 flex justify-between items-center transition relative z-10">
                        <div className="text-sm flex flex-col">
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Prêmio Acumulado</span>
                          <span className="font-bold text-emerald-600 font-mono text-base">
                            R$ {(match.poolTotal * 0.9).toFixed(2)}
                          </span>
                        </div>
                        <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-yellow-400/25 transition-colors border border-slate-200 group-hover:border-yellow-300">
                          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-amber-800 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {normalPromotionalMatches.length > 0 && (
            <div>
              <h2 className="text-xl font-display font-bold text-indigo-800 mb-2 flex items-center gap-2">
                🌟 Jogos Promocionais
              </h2>
              <p className="text-slate-500 text-sm mb-6 border-b border-indigo-100 pb-4">Estas partidas valem somente para pontuação na classificação geral. O palpite custa R$ 1,00.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {normalPromotionalMatches.map(match => {
                  const date = new Date(match.date);
                  const isFinished = match.status === 'finished';
                  const isOpen = match.status === 'open' && (date.getTime() - Date.now() >= 30 * 60 * 1000);

                  return (
                    <Link 
                      key={match.id} 
                      to={`/match/${match.id}`}
                      className="group bg-gradient-to-b from-indigo-50/50 to-white rounded-3xl border border-indigo-200 overflow-hidden hover:border-indigo-500 transition-all flex flex-col relative shadow-sm hover:shadow-md transform hover:-translate-y-1"
                    >
                      <div className="bg-indigo-100/50 px-5 py-3 border-b border-indigo-100 flex justify-between items-center text-sm relative z-10">
                        <div className="flex flex-col items-start">
                          <span className="text-indigo-600/80 font-semibold tracking-wide text-xs">
                            {date.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })} às {date.toLocaleTimeString('pt-BR', { timeZone: 'America/Manaus', hour: '2-digit', minute: '2-digit' })} (UTC -4:00)
                          </span>
                          <MatchCountdown matchDate={match.date} isOpen={isOpen} />
                        </div>
                        
                        {isOpen ? (
                          <span className="bg-indigo-500 text-white font-bold px-2.5 py-1 rounded-md text-xs shadow-sm flex items-center">Aberto</span>
                        ) : isFinished ? (
                          <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-md text-xs flex items-center border border-blue-100">
                            <CheckCircle2 className="h-3 w-3 mr-1.5" /> Finalizado
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 font-bold px-2.5 py-1 rounded-md text-xs flex items-center border border-amber-100">
                            <Lock className="h-3 w-3 mr-1.5" /> Fechado
                          </span>
                        )}
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col justify-center relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col items-center space-y-3 w-1/3">
                            {match.flag1?.startsWith('http') || match.flag1?.startsWith('data:') ? (
                              <div className="relative">
                                 <div className="absolute inset-0 bg-slate-200 rounded-md blur"></div>
                                 <img src={match.flag1} alt={match.team1} className="w-16 h-11 object-cover rounded-md shadow-md border border-slate-100 relative z-10" />
                              </div>
                             ) : (
                              <span className="text-5xl drop-shadow-md" title={match.team1}>{match.flag1}</span>
                            )}
                            <span className="font-bold text-slate-800 text-center text-sm">{match.team1}</span>
                          </div>
                          
                          <div className="w-1/3 flex flex-col items-center justify-center">
                            {isFinished ? (
                              <div className="bg-indigo-100 border border-indigo-200 text-indigo-900 px-5 py-2.5 rounded-xl font-display text-2xl font-bold flex space-x-2 shadow-inner">
                                <span>{match.result1}</span>
                                <span className="text-indigo-400">-</span>
                                <span>{match.result2}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-bold text-sm tracking-widest uppercase">VS</span>
                            )}
                          </div>

                          <div className="flex flex-col items-center space-y-3 w-1/3">
                            {match.flag2?.startsWith('http') || match.flag2?.startsWith('data:') ? (
                               <div className="relative">
                                  <div className="absolute inset-0 bg-slate-200 rounded-md blur"></div>
                                  <img src={match.flag2} alt={match.team2} className="w-16 h-11 object-cover rounded-md shadow-md border border-slate-100 relative z-10" />
                               </div>
                             ) : (
                              <span className="text-5xl drop-shadow-md" title={match.team2}>{match.flag2}</span>
                            )}
                            <span className="font-bold text-slate-800 text-center text-sm">{match.team2}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-indigo-50/80 px-5 py-4 border-t border-indigo-100 flex justify-between items-center transition relative z-10">
                        <div className="text-sm flex flex-col">
                          <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Pontos p/ Classificação</span>
                          <span className="font-bold text-indigo-600 text-sm">
                            Até 5 pts
                          </span>
                        </div>
                        <div className="text-sm flex flex-col items-end">
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Custo Aposta</span>
                          <span className="font-bold text-indigo-700 font-mono text-base">
                            R$ 1.00
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
