import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { MinutoCertoDraw, MinutoCertoTicket, UserProfile } from '../types';
import { Clock, Trophy, Check, X, Award, AlertCircle, ArrowLeft, Coins, HelpCircle } from 'lucide-react';
import { formatMinuteValue, getMinutePeriod } from '../lib/utils';
import googleScoreboardImg from '../assets/images/google_scoreboard_1783945113545.jpg';

export default function UserMinutoCerto() {
  const { user, profile } = useAuth();
  const [minutoDraws, setMinutoDraws] = useState<MinutoCertoDraw[]>([]);
  const [minutoTickets, setMinutoTickets] = useState<MinutoCertoTicket[]>([]);
  const [isPurchasingMinuto, setIsPurchasingMinuto] = useState(false);
  const [minutoToast, setMinutoToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubMC_Draws = onSnapshot(collection(db, 'minuto_certo_draws'), (snapshot) => {
      const mcDrawsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MinutoCertoDraw));
      setMinutoDraws(mcDrawsData);
    });

    const unsubMC_Tickets = onSnapshot(collection(db, 'minuto_certo_tickets'), (snapshot) => {
      const mcTicketsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MinutoCertoTicket));
      setMinutoTickets(mcTicketsData);
    });

    return () => {
      unsubMC_Draws();
      unsubMC_Tickets();
    };
  }, [user]);

  const handleBuyMultipleMinutoTickets = async (drawId: string, quantity: number) => {
    if (!user || !profile) return;
    const draw = minutoDraws.find(d => d.id === drawId);
    if (!draw) return;

    if (draw.status !== 'active') {
      setMinutoToast({ message: 'Este sorteio já está encerrado!', type: 'error' });
      setTimeout(() => setMinutoToast(null), 4000);
      return;
    }

    const currentBalance = profile.balance || 0;
    const totalCost = draw.price * quantity;
    if (currentBalance < totalCost) {
      setMinutoToast({ message: `Saldo insuficiente! Para comprar ${quantity}x bilhetes, você precisa de R$ ${totalCost.toFixed(2)}.`, type: 'error' });
      setTimeout(() => setMinutoToast(null), 4000);
      return;
    }

    setIsPurchasingMinuto(true);

    try {
      // 1. Fetch all sold minutes for this draw to find available ones
      const drawTickets = minutoTickets.filter(t => t.drawId === drawId);
      const soldMinutes = drawTickets.map(t => t.minuteValue);

      const availableMinutes: number[] = [];
      for (let i = 1; i <= 100; i++) {
        if (!soldMinutes.includes(i)) {
          availableMinutes.push(i);
        }
      }

      if (availableMinutes.length === 0) {
        setMinutoToast({ message: 'Todos os bilhetes para este sorteio foram vendidos!', type: 'error' });
        setTimeout(() => setMinutoToast(null), 4000);
        setIsPurchasingMinuto(false);
        return;
      }

      const purchaseQty = Math.min(quantity, availableMinutes.length);
      if (purchaseQty < quantity) {
        setMinutoToast({ message: `Apenas ${availableMinutes.length} minutos estão disponíveis para compra neste sorteio.`, type: 'error' });
        setTimeout(() => setMinutoToast(null), 4000);
        setIsPurchasingMinuto(false);
        return;
      }

      // 2. Select distinct random minutes
      const selectedMinutes: number[] = [];
      const tempAvailable = [...availableMinutes];
      for (let i = 0; i < purchaseQty; i++) {
        const randomIndex = Math.floor(Math.random() * tempAvailable.length);
        selectedMinutes.push(tempAvailable[randomIndex]);
        tempAvailable.splice(randomIndex, 1);
      }

      // 3. Run Transaction
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error('Perfil de usuário não encontrado.');
        
        const freshProfile = userSnap.data() as UserProfile;
        const freshBalance = freshProfile.balance || 0;
        const actualCost = draw.price * purchaseQty;

        if (freshBalance < actualCost) {
          throw new Error('Saldo insuficiente (atualizado)');
        }

        // Verify all ticket docs do not exist yet (must perform reads first in transaction)
        const ticketCheckResults = [];
        for (const m of selectedMinutes) {
          const tDocId = `${drawId}_${m}`;
          const tRef = doc(db, 'minuto_certo_tickets', tDocId);
          const tSnap = await transaction.get(tRef);
          if (tSnap.exists()) {
            throw new Error(`O minuto ${formatMinuteValue(m)} foi adquirido por outro jogador. Tente novamente!`);
          }
          ticketCheckResults.push({ ref: tRef, minute: m, label: formatMinuteValue(m) });
        }

        // Deduct balance
        const newBalance = freshBalance - actualCost;
        transaction.update(userRef, { balance: newBalance });

        // Save Tickets
        for (const item of ticketCheckResults) {
          transaction.set(item.ref, {
            drawId,
            userId: user.uid,
            userName: profile.name,
            minuteValue: item.minute,
            minuteLabel: item.label,
            price: draw.price,
            createdAt: serverTimestamp()
          });
        }

        // Create transaction receipt
        const transRef = doc(collection(db, 'transactions'));
        const labelsList = [...selectedMinutes].sort((a, b) => a - b).map(m => formatMinuteValue(m)).join(', ');
        transaction.set(transRef, {
          userId: user.uid,
          type: 'bet',
          amount: -actualCost,
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          description: `Compra de Bilhetes Minuto Certo (${purchaseQty}x) - Minutos: ${labelsList} (Partida: ${draw.matchName})`
        });
      });

      const purchasedLabels = [...selectedMinutes].sort((a, b) => a - b).map(m => formatMinuteValue(m)).join(', ');
      setMinutoToast({ message: `Sucesso! Você adquiriu ${purchaseQty} bilhete(s): ${purchasedLabels}!`, type: 'success' });
      setTimeout(() => setMinutoToast(null), 4000);
    } catch (err: any) {
      console.error(err);
      setMinutoToast({ message: err.message || 'Erro ao realizar a compra.', type: 'error' });
      setTimeout(() => setMinutoToast(null), 4000);
    } finally {
      setIsPurchasingMinuto(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Back link & Title header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <Link 
            to="/" 
            className="p-2 hover:bg-slate-100 rounded-xl transition duration-150 text-slate-500 hover:text-slate-800"
            title="Voltar para Início"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-650 bg-amber-50 px-2.5 py-0.5 border border-amber-200/50 rounded-full">
              Sorteio Oficial
            </span>
            <h1 className="text-3xl font-display font-black text-slate-800 tracking-tight mt-1 flex items-center gap-2">
              <Clock className="w-8 h-8 text-amber-500 shrink-0" />
              Minuto Certo
            </h1>
          </div>
        </div>

        {/* User Balance Quick Info */}
        {profile && (
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between gap-6 self-start md:self-auto shadow-xs">
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seu Saldo Disponível</span>
              <span className="font-mono font-black text-emerald-700 text-lg">R$ {profile.balance?.toFixed(2) || '0,00'}</span>
            </div>
            <Link 
              to="/panel?openFinance=true" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider px-3.5 py-2 rounded-xl transition duration-150 flex items-center gap-1.5 shadow-sm shadow-emerald-500/10"
            >
              <Coins className="w-4 h-4" />
              <span>Depositar</span>
            </Link>
          </div>
        )}
      </div>

      {/* Minuto Certo Toast Notification */}
      {minutoToast && (
        <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 animate-fade-in ${
          minutoToast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {minutoToast.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-rose-600" />}
          <span>{minutoToast.message}</span>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 columns: Sorteios Ativos and the Minute Boards */}
        <div className="lg:col-span-2 space-y-6">
          {minutoDraws.filter(d => d.status === 'active').length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700">Nenhum sorteio de Minuto Certo ativo</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                Fique de olho! Os administradores abrem novos sorteios de Minuto Certo logo antes das partidas oficiais iniciarem.
              </p>
              <Link 
                to="/" 
                className="mt-6 inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm transition"
              >
                Voltar ao Início
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {minutoDraws.filter(d => d.status === 'active').map(draw => {
                const drawTickets = minutoTickets.filter(t => t.drawId === draw.id);
                const myTickets = drawTickets.filter(t => t.userId === user?.uid);
                const sortedMyTickets = [...myTickets].sort((a, b) => a.minuteValue - b.minuteValue);

                return (
                  <div key={draw.id} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm text-left">
                    {/* Draw Header Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 rounded-md inline-block">
                          Partida em Destaque
                        </span>
                        <h2 className="text-xl sm:text-2xl font-display font-black text-slate-800 mt-2">{draw.matchName}</h2>
                        <span className="text-xs font-semibold text-slate-400 mt-1 block">
                          {draw.date.split('-').reverse().join('/')} às {draw.time}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                        <span className="text-xs font-extrabold text-slate-650 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50 self-start sm:self-auto">
                          Preço por Bilhete: <strong className="text-amber-750 font-mono">R$ {draw.price.toFixed(2)}</strong>
                        </span>
                        
                        <div className="flex flex-col gap-2 w-full">
                          <button
                            onClick={() => handleBuyMultipleMinutoTickets(draw.id, 1)}
                            disabled={isPurchasingMinuto}
                            className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-slate-950 font-black py-2.5 px-5 rounded-xl transition duration-150 shadow-md shadow-amber-500/10 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 w-full"
                          >
                            <span>Adquirir 1x Bilhete</span>
                          </button>
                          
                          <div className="grid grid-cols-3 gap-1.5 w-full">
                            <button
                              onClick={() => handleBuyMultipleMinutoTickets(draw.id, 5)}
                              disabled={isPurchasingMinuto}
                              className="bg-amber-100 hover:bg-amber-200 disabled:bg-slate-200 text-amber-950 font-extrabold py-2 px-1 rounded-xl transition duration-150 text-[10px] uppercase tracking-wider whitespace-nowrap cursor-pointer text-center border border-amber-200/30 shadow-xs"
                              title="Comprar 5 bilhetes aleatórios de uma vez"
                            >
                              Comprar 5x
                            </button>
                            <button
                              onClick={() => handleBuyMultipleMinutoTickets(draw.id, 10)}
                              disabled={isPurchasingMinuto}
                              className="bg-amber-100 hover:bg-amber-200 disabled:bg-slate-200 text-amber-950 font-extrabold py-2 px-1 rounded-xl transition duration-150 text-[10px] uppercase tracking-wider whitespace-nowrap cursor-pointer text-center border border-amber-200/30 shadow-xs"
                              title="Comprar 10 bilhetes aleatórios de uma vez"
                            >
                              Comprar 10x
                            </button>
                            <button
                              onClick={() => handleBuyMultipleMinutoTickets(draw.id, 25)}
                              disabled={isPurchasingMinuto}
                              className="bg-amber-100 hover:bg-amber-200 disabled:bg-slate-200 text-amber-950 font-extrabold py-2 px-1 rounded-xl transition duration-150 text-[10px] uppercase tracking-wider whitespace-nowrap cursor-pointer text-center border border-amber-200/30 shadow-xs"
                              title="Comprar 25 bilhetes aleatórios de uma vez"
                            >
                              Comprar 25x
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* User's purchased tickets list */}
                    <div className="space-y-3 bg-amber-50/20 border border-amber-200/30 p-4 rounded-2xl">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        Seus Bilhetes Adquiridos ({sortedMyTickets.length})
                      </h3>
                      {sortedMyTickets.length === 0 ? (
                        <p className="text-xs text-slate-400 font-medium italic">Você ainda não possui bilhetes para este sorteio.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {sortedMyTickets.map(ticket => (
                            <span
                              key={ticket.id}
                              className="inline-flex items-center gap-1.5 bg-white text-amber-850 font-mono font-extrabold text-xs px-3 py-2 rounded-xl border border-amber-200 shadow-xs"
                            >
                              <Trophy className="w-3.5 h-3.5 text-amber-500" />
                              {ticket.minuteLabel} min ({getMinutePeriod(ticket.minuteValue)})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Visual Availability Board */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                          Mapa de Minutos do Jogo (1 a 100)
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400">
                          {100 - drawTickets.length} livres
                        </span>
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                        {Array.from({ length: 100 }, (_, index) => {
                          const minVal = index + 1;
                          const t = drawTickets.find(ticket => ticket.minuteValue === minVal);
                          const isMine = t && t.userId === user?.uid;
                          const isTaken = t && t.userId !== user?.uid;

                          return (
                            <div
                              key={minVal}
                              className={`h-9 text-[10px] font-mono font-extrabold rounded-lg flex items-center justify-center border transition-all ${
                                isMine 
                                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs shadow-emerald-500/10'
                                  : isTaken
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60 cursor-not-allowed'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/20'
                              }`}
                              title={
                                isMine 
                                  ? `Minuto ${formatMinuteValue(minVal)}: Seu` 
                                  : isTaken 
                                  ? `Minuto ${formatMinuteValue(minVal)}: Vendido` 
                                  : `Minuto ${formatMinuteValue(minVal)}: Disponível!`
                              }
                            >
                              {formatMinuteValue(minVal)}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-4 text-[10px] font-bold text-slate-400 mt-2 flex-wrap border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 border border-emerald-600 inline-block"></span>
                          <span>Seu Bilhete</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-200 inline-block"></span>
                          <span>Vendido</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-md bg-white border border-slate-200 inline-block"></span>
                          <span>Disponível</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 column: Simplified Rules of the Raffle & Official Reference Info */}
        <div className="space-y-6">
          
          {/* Rules Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm text-left">
            <h3 className="font-display font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <HelpCircle className="w-5 h-5 text-amber-500" />
              Como Funciona o Jogo?
            </h3>
            
            <ul className="space-y-4 text-xs text-slate-650 font-medium">
              <li className="flex gap-2.5">
                <span className="bg-amber-100 text-amber-800 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-extrabold text-slate-800 mb-0.5">Sorteio de Minuto</p>
                  <p className="leading-relaxed">Ao adquirir um bilhete por R$ 2,00, o sistema sorteia na hora um minuto aleatório ainda livre (de 1 a 100).</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="bg-amber-100 text-amber-800 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-extrabold text-slate-800 mb-0.5">Prêmio Único de R$ 100,00</p>
                  <p className="leading-relaxed">Se o primeiro gol da partida sair no seu minuto, você ganha o prêmio completo de R$ 100,00 sozinho! O prêmio não é dividido.</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="bg-amber-100 text-amber-800 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-extrabold text-slate-800 mb-0.5">Sucessão de Gols</p>
                  <p className="leading-relaxed">Caso o primeiro gol aconteça em um minuto que não foi comprado, o prêmio se transfere imediatamente para o segundo gol do jogo, e assim por diante!</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="bg-amber-100 text-amber-800 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">4</span>
                <div>
                  <p className="font-extrabold text-slate-800 mb-0.5">Critério de Aproximação</p>
                  <p className="leading-relaxed">Se a partida tiver gols mas ninguém tiver os minutos exatos deles, ganha o jogador com o minuto comprado mais próximo do primeiro gol!</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="bg-amber-100 text-amber-800 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">5</span>
                <div>
                  <p className="font-extrabold text-slate-800 mb-0.5">Critério de Desempate</p>
                  <p className="leading-relaxed">Havendo empate exato na aproximação, leva quem estiver melhor classificado na Classificação Geral do Bolão após o fim da partida.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Reference Image Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm text-left">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
              <Clock className="w-4 h-4" />
              Referência do Minuto Oficial
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              O minuto do gol é definido pelo tempo exato mostrado no painel de placar oficial do Google. Veja o exemplo real da apuração oficial de minutos:
            </p>

            <div className="my-2 bg-white border border-slate-200/80 p-2 rounded-xl flex flex-col items-center">
              <img 
                src={googleScoreboardImg} 
                alt="Placar Oficial Google" 
                className="max-w-full rounded-lg shadow-xs max-h-[100px] object-contain"
                referrerPolicy="no-referrer"
              />
              <span className="text-[9px] text-slate-400 font-bold mt-1.5">
                Noruega 1 x 2 Inglaterra
              </span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-550 leading-relaxed">
              <p>⏱️ <strong>Minuto 36:</strong> Primeiro gol do jogo aos 36 minutos.</p>
              <p>⏱️ <strong>Minuto 47:</strong> Gol aos 45+2 minutos (acréscimos do primeiro tempo).</p>
              <p>⏱️ <strong>Minuto 98:</strong> Gol aos 93 minutos (tempo regulamentar + acréscimos do segundo tempo).</p>
            </div>
            
            <p className="text-[10px] text-slate-450 italic pt-1 border-t border-slate-200">
              * Para regras detalhadas e mapeamento dos 100 minutos da partida, consulte a página de <Link to="/regulamento" className="underline text-indigo-600 hover:text-indigo-800 font-bold">regulamentos</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
