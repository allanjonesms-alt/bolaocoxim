import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Match } from '../types';
import { Trophy, CalendarClock, ChevronRight, CheckCircle2, Lock, Radio, Flame, Crown, Calendar, Lightbulb, AlertCircle, Download, FileText } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import MatchCountdown from '../components/MatchCountdown';
import { generateMatchBetsPDF } from '../utils/pdfGenerator';

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [leader, setLeader] = useState<{ userName: string; points: number } | null>(null);
  const [totalPrizePool, setTotalPrizePool] = useState<number>(0);
  const [printingPdfId, setPrintingPdfId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // We get all bets to calculate leaderboard summary on Home in real-time
    const q = query(collection(db, 'bets'));
    const unsubscribeBets = onSnapshot(q, (snapshot) => {
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
      
      setTotalPrizePool(calculatedPrizePool);
      if (rows.length > 0) {
        setLeader(rows[0]);
      } else {
        setLeader(null);
      }
    }, (error) => {
      console.error("Error loading home leaderboard summary:", error);
    });

    return () => unsubscribeBets();
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

  const liveMatches = matches.filter(match => {
    if (match.status === 'finished') return false;
    const matchDate = new Date(match.date).getTime();
    return now >= matchDate;
  });

  const urgentPromotionalMatches = matches.filter(match => {
    if (!match.isPromotional || match.status !== 'open') return false;
    const matchDate = new Date(match.date).getTime();
    if (now >= matchDate) return false;
    const closingTime = matchDate - 30 * 60 * 1000;
    const timeLeft = closingTime - now;
    return timeLeft > 0 && timeLeft <= 3 * 60 * 60 * 1000;
  });

  const normalPromotionalMatches = matches.filter(match => {
    if (!match.isPromotional) return false;
    const matchDate = new Date(match.date).getTime();
    if (now >= matchDate) return false;
    if (match.status === 'open') {
      const closingTime = matchDate - 30 * 60 * 1000;
      const timeLeft = closingTime - now;
      if (timeLeft > 0 && timeLeft <= 3 * 60 * 60 * 1000) return false;
    }
    return true;
  });

  const officialMatches = matches.filter(match => {
    if (match.isPromotional) return false;
    const matchDate = new Date(match.date).getTime();
    const isLive = match.status !== 'finished' && now >= matchDate;
    return !isLive;
  });

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

      {/* Dica de Ouro de Jogos Promocionais */}
      <div id="promotional-games-tip" className="bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-white border border-amber-300/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/5 rounded-full blur-xl pointer-events-none"></div>
        <div className="bg-amber-100 border border-amber-300 p-2 rounded-xl shrink-0">
          <Lightbulb className="h-5 w-5 text-amber-600 animate-pulse" />
        </div>
        <div className="text-slate-700 text-sm leading-relaxed relative z-10 font-medium">
          <strong className="text-amber-800 font-extrabold mr-1">Dica de Campeão:</strong> 
          Dobre suas chances de subir no ranking! Dê seus palpites nos <strong className="text-slate-900 font-bold">Jogos Promocionais</strong> (palpites de apenas R$ 1,00) para acumular mais pontos extras e disparar rumo ao topo da Classificação Geral!
        </div>
      </div>

      {/* Seção de Classificação Geral Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card do Líder */}
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-white border border-yellow-500/30 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-2xl pointer-events-none group-hover:bg-yellow-400/10 transition-all"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-yellow-100 border border-yellow-300 p-3.5 rounded-2xl">
              <Crown className="h-7 w-7 text-yellow-600 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                Líder da Classificação
              </span>
              <h3 className="font-display font-black text-xl text-slate-800 mt-1 truncate max-w-[200px] sm:max-w-[250px]">
                {leader ? leader.userName : 'Sem registro'}
              </h3>
              <p className="text-slate-500 text-xs font-semibold mt-0.5 flex items-center gap-1">
                <Trophy className="h-3 w-3 text-slate-400 shrink-0" />
                {leader ? `${leader.points} pontos acumulados` : 'Faça palpites para pontuar'}
              </p>
            </div>
          </div>
          <Link
            to="/leaderboard"
            className="bg-slate-50 hover:bg-yellow-400 border border-slate-200/85 hover:border-yellow-400 hover:text-slate-950 p-2.5 rounded-xl transition-all shadow-sm"
          >
            <ChevronRight className="h-5 w-5 text-slate-600 hover:text-slate-900" />
          </Link>
        </div>

        {/* Card do Prêmio Acumulado */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-white to-white border border-emerald-500/20 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-400/10 transition-all"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-emerald-100 border border-emerald-300 p-3.5 rounded-2xl">
              <Trophy className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                Prêmio Estimado Rank 1
              </span>
              <h3 className="font-mono font-black text-2xl text-emerald-700 mt-1">
                R$ {(totalPrizePool * 30).toFixed(2)}
              </h3>
              <p className="text-slate-500 text-xs font-semibold mt-0.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                Entrega em <strong className="text-slate-700">19/07 (Final da Copa)</strong>
              </p>
            </div>
          </div>
          <Link
            to="/leaderboard"
            className="bg-slate-50 hover:bg-emerald-500 hover:text-white border border-slate-200/85 hover:border-emerald-500 p-2.5 rounded-xl transition-all shadow-sm"
          >
            <ChevronRight className="h-5 w-5 text-slate-600 hover:text-slate-900" />
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
          {/* Jogos Ao Vivo / Em Andamento */}
          {liveMatches.length > 0 && (
            <div className="bg-gradient-to-r from-red-55/40 via-white to-red-55/40 border-2 border-red-500/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-red-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-red-400/5 rounded-full blur-[60px] pointer-events-none"></div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div>
                  <h2 className="text-2xl font-display font-black text-red-650 flex items-center gap-2.5">
                    <span className="relative flex h-4.5 w-4.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-450 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-red-650"></span>
                    </span>
                    <Radio className="h-6 w-6 text-red-600 shrink-0" />
                    PARTIDAS AO VIVO / EM ANDAMENTO
                  </h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">
                    Veja os placares em andamento e acompanhe a lista de palpites válidos! (Apostas encerradas)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                {liveMatches.map(match => {
                  const date = new Date(match.date);
                  const isPromo = match.isPromotional;

                  return (
                    <Link
                      key={match.id}
                      to={`/match/${match.id}`}
                      className="group bg-white rounded-3xl border-2 border-red-500/60 overflow-hidden hover:border-red-600 hover:shadow-lg transition-all flex flex-col relative transform hover:-translate-y-1"
                    >
                      {/* Live Badge */}
                      <div className="absolute top-0 right-0 bg-red-650 text-white font-mono text-[9px] font-black px-3.5 py-1.5 rounded-bl-xl uppercase tracking-widest relative z-20 shadow-sm flex items-center gap-1 animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-white inline-block"></span>
                        AO VIVO
                      </div>

                      <div className="bg-red-50/50 px-5 py-3.5 border-b border-red-100 flex items-center justify-between text-sm relative z-10 pr-24">
                        <span className="text-red-700 font-extrabold text-xs flex items-center gap-1.5">
                          {isPromo ? '🌟 Jogo Promocional' : '⚽ Jogo Oficial'}
                        </span>
                      </div>

                      <div className="p-8 flex-1 flex flex-col justify-center relative z-10">
                        <div className="flex items-center justify-between">
                          {/* Team 1 */}
                          <div className="flex flex-col items-center space-y-3 w-1/3">
                            {match.flag1?.startsWith('http') || match.flag1?.startsWith('data:') ? (
                              <div className="relative">
                                <div className="absolute inset-0 bg-slate-200 rounded-md blur"></div>
                                <img src={match.flag1} alt={match.team1} className="w-16 h-11 object-cover rounded-md shadow-md border border-slate-100 relative z-10" />
                              </div>
                            ) : (
                              <span className="text-5xl drop-shadow-md" title={match.team1}>{match.flag1}</span>
                            )}
                            <span className="font-extrabold text-slate-800 text-center text-sm truncate w-full">{match.team1}</span>
                          </div>

                          {/* Live Score Display */}
                          <div className="w-1/3 flex flex-col items-center justify-center">
                            <span className="text-[9px] text-red-500 font-black uppercase tracking-wider mb-2">PLACAR</span>
                            <div className="bg-red-600 text-white px-4.5 py-2 rounded-xl font-display text-2xl font-black flex space-x-2.5 shadow-md shadow-red-500/20">
                              <span>{match.liveResult1 ?? 0}</span>
                              <span className="text-red-305 opacity-85 animate-pulse">:</span>
                              <span>{match.liveResult2 ?? 0}</span>
                            </div>
                          </div>

                          {/* Team 2 */}
                          <div className="flex flex-col items-center space-y-3 w-1/3">
                            {match.flag2?.startsWith('http') || match.flag2?.startsWith('data:') ? (
                              <div className="relative">
                                <div className="absolute inset-0 bg-slate-200 rounded-md blur"></div>
                                <img src={match.flag2} alt={match.team2} className="w-16 h-11 object-cover rounded-md shadow-md border border-slate-100 relative z-10" />
                              </div>
                            ) : (
                              <span className="text-5xl drop-shadow-md" title={match.team2}>{match.flag2}</span>
                            )}
                            <span className="font-extrabold text-slate-800 text-center text-sm truncate w-full">{match.team2}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-red-55/10 px-5 py-4 border-t border-red-100/50 flex justify-between items-center transition relative z-10">
                        <div className="text-xs flex flex-col text-slate-400">
                          <span className="font-semibold">{date.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })} {date.toLocaleTimeString('pt-BR', { timeZone: 'America/Manaus', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-xs font-bold text-red-650 flex items-center gap-0.5 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-xl group-hover:bg-red-600 group-hover:text-white transition">
                          Acompanhar <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

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
                            {date.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })} às {date.toLocaleTimeString('pt-BR', { timeZone: 'America/Manaus', hour: '2-digit', minute: '2-digit' })}
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
                      
                      <div className="bg-red-50/30 px-5 py-4 border-t border-red-100/50 flex justify-end items-center transition relative z-10">
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

              {/* Informação Importante sobre Encerramento e PDF */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-white border border-emerald-500/30 rounded-3xl p-5 mb-6 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div className="bg-emerald-100 border border-emerald-300 p-3 rounded-2xl shrink-0 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-emerald-700 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    📢 INFORMAÇÃO IMPORTANTE & TRANSPARÊNCIA
                  </h4>
                  <p className="text-slate-650 text-xs sm:text-sm leading-relaxed font-medium">
                    As apostas se encerram pontualmente às <strong className="text-emerald-800 font-extrabold">17h30</strong>. Logo após o encerramento, estará disponível para download o <strong className="text-slate-800 font-bold">arquivo PDF com todas as apostas registradas</strong>, garantindo total lisura, transparência e segurança de todos os participantes do nosso Bolão!
                  </p>
                </div>
              </div>

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
                            {date.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })} às {date.toLocaleTimeString('pt-BR', { timeZone: 'America/Manaus', hour: '2-digit', minute: '2-digit' })}
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
                        
                        {!isOpen ? (
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (printingPdfId) return;
                              setPrintingPdfId(match.id);
                              await generateMatchBetsPDF(match);
                              setPrintingPdfId(null);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-emerald-500/10 hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                            title="Baixar PDF com todos os palpites para transparência"
                            disabled={printingPdfId !== null}
                          >
                            <Download className={`h-3.5 w-3.5 ${printingPdfId === match.id ? 'animate-bounce' : ''}`} />
                            <span>{printingPdfId === match.id ? 'Gerando...' : 'Palpites PDF'}</span>
                          </button>
                        ) : (
                          <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-yellow-400/25 transition-colors border border-slate-200 group-hover:border-yellow-300">
                            <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-amber-800 transition-colors" />
                          </div>
                        )}
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
                            {date.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })} às {date.toLocaleTimeString('pt-BR', { timeZone: 'America/Manaus', hour: '2-digit', minute: '2-digit' })}
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
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Custo Aposta</span>
                          <span className="font-bold text-indigo-700 font-mono text-base">
                            R$ 1.00
                          </span>
                        </div>
                        
                        {!isOpen ? (
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (printingPdfId) return;
                              setPrintingPdfId(match.id);
                              await generateMatchBetsPDF(match);
                              setPrintingPdfId(null);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-indigo-500/10 hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                            title="Baixar PDF com todos os palpites para transparência"
                            disabled={printingPdfId !== null}
                          >
                            <Download className={`h-3.5 w-3.5 ${printingPdfId === match.id ? 'animate-bounce' : ''}`} />
                            <span>{printingPdfId === match.id ? 'Gerando...' : 'Palpites PDF'}</span>
                          </button>
                        ) : (
                          <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-indigo-100 transition-colors border border-slate-200">
                            <ChevronRight className="h-5 w-5 text-indigo-500 transition-colors" />
                          </div>
                        )}
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
