import { useState, useEffect, FormEvent } from 'react';
import { collection, onSnapshot, doc, runTransaction, serverTimestamp, getDocs, deleteDoc, query, where, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MinutoCertoDraw, MinutoCertoTicket, UserProfile } from '../types';
import { formatMinuteValue, getMinutePeriod } from '../lib/utils';
import { ArrowLeft, Clock, Calendar, Check, X, Trophy, Plus, RefreshCw, Trash2, Edit2, ShieldAlert, Award, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminMinutoCerto({ isSubcomponent = false }: { isSubcomponent?: boolean }) {
  const [draws, setDraws] = useState<MinutoCertoDraw[]>([]);
  const [tickets, setTickets] = useState<MinutoCertoTicket[]>([]);
  const [selectedDrawId, setSelectedDrawId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Form State
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [editingDrawId, setEditingDrawId] = useState<string | null>(null);
  const [drawForm, setDrawForm] = useState({
    matchName: '',
    date: '',
    time: '',
    price: 2,
    prize: 100,
    observations: ''
  });

  // Finish Draw State
  const [finishingDraw, setFinishingDraw] = useState<MinutoCertoDraw | null>(null);
  const [winningMinuteInput, setWinningMinuteInput] = useState('');
  const [isSubmittingWinner, setIsSubmittingWinner] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Listeners
  useEffect(() => {
    const unsubDraws = onSnapshot(collection(db, 'minuto_certo_draws'), (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MinutoCertoDraw));
      fetched.sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
      setDraws(fetched);
      if (fetched.length > 0 && !selectedDrawId) {
        setSelectedDrawId(fetched[0].id);
      }
      setLoading(false);
    });

    return () => unsubDraws();
  }, [selectedDrawId]);

  useEffect(() => {
    if (!selectedDrawId) {
      setTickets([]);
      return;
    }

    const q = query(collection(db, 'minuto_certo_tickets'), where('drawId', '==', selectedDrawId));
    const unsubTickets = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MinutoCertoTicket));
      fetched.sort((a, b) => a.minuteValue - b.minuteValue);
      setTickets(fetched);
    });

    return () => unsubTickets();
  }, [selectedDrawId]);

  // Handle Save Draw
  const handleSaveDraw = async (e: FormEvent) => {
    e.preventDefault();
    if (!drawForm.matchName || !drawForm.date || !drawForm.time) {
      showToast('Preencha o nome da partida, data e horário.', 'error');
      return;
    }

    try {
      if (editingDrawId) {
        await setDoc(doc(db, 'minuto_certo_draws', editingDrawId), {
          matchName: drawForm.matchName,
          date: drawForm.date,
          time: drawForm.time,
          price: Number(drawForm.price),
          prize: Number(drawForm.prize),
          observations: drawForm.observations || ''
        }, { merge: true });
        showToast('Sorteio do Minuto Certo atualizado!', 'success');
      } else {
        const newRef = doc(collection(db, 'minuto_certo_draws'));
        await setDoc(newRef, {
          matchName: drawForm.matchName,
          date: drawForm.date,
          time: drawForm.time,
          price: Number(drawForm.price),
          prize: Number(drawForm.prize),
          observations: drawForm.observations || '',
          status: 'active',
          winningMinute: null,
          winnerId: null,
          winnerName: null,
          createdAt: serverTimestamp()
        });
        showToast('Novo sorteio do Minuto Certo cadastrado!', 'success');
      }
      setShowDrawForm(false);
      setEditingDrawId(null);
      setDrawForm({ matchName: '', date: '', time: '', price: 2, prize: 100, observations: '' });
    } catch (err) {
      showToast('Erro ao salvar o sorteio.', 'error');
    }
  };

  // Handle Edit Draw Click
  const handleEditClick = (draw: MinutoCertoDraw) => {
    setDrawForm({
      matchName: draw.matchName,
      date: draw.date,
      time: draw.time,
      price: draw.price,
      prize: draw.prize,
      observations: draw.observations || ''
    });
    setEditingDrawId(draw.id);
    setShowDrawForm(true);
  };

  // Handle Delete Draw
  const handleDeleteDraw = async (drawId: string) => {
    if (!window.confirm('Tem certeza de que deseja deletar este sorteio? Todos os bilhetes vendidos associados também poderão ser afetados.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'minuto_certo_draws', drawId));
      showToast('Sorteio removido com sucesso.', 'success');
      if (selectedDrawId === drawId) {
        setSelectedDrawId('');
      }
    } catch (err) {
      showToast('Erro ao remover sorteio.', 'error');
    }
  };

  // Handle Delete Sold Ticket
  const handleDeleteTicket = async (ticket: MinutoCertoTicket) => {
    const ticketPrice = ticket.price || 2;
    if (!window.confirm(`Tem certeza de que deseja excluir o bilhete do minuto ${ticket.minuteLabel} de ${ticket.userName}? R$ ${ticketPrice.toFixed(2)} serão reembolsados ao saldo do apostador.`)) {
      return;
    }

    try {
      const drawInfo = draws.find(d => d.id === ticket.drawId);
      const drawName = drawInfo ? drawInfo.matchName : 'Sorteio';

      await runTransaction(db, async (transaction) => {
        const ticketRef = doc(db, 'minuto_certo_tickets', ticket.id);
        const ticketSnap = await transaction.get(ticketRef);
        if (!ticketSnap.exists()) {
          throw new Error('Bilhete não encontrado ou já excluído.');
        }

        const ticketData = ticketSnap.data() as MinutoCertoTicket;
        const refundAmount = ticketData.price || 2;

        // Refund user
        const userRef = doc(db, 'users', ticketData.userId);
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          const currentBalance = userData.balance || 0;
          transaction.update(userRef, { balance: currentBalance + refundAmount });

          // Create transaction record
          const transRef = doc(collection(db, 'transactions'));
          transaction.set(transRef, {
            userId: ticketData.userId,
            type: 'refund',
            amount: refundAmount,
            status: 'confirmed',
            timestamp: serverTimestamp(),
            description: `Reembolso de Bilhete Minuto Certo Excluído por Administrador - Minuto: ${ticketData.minuteLabel} (Partida: ${drawName})`
          });
        }

        // Delete the ticket
        transaction.delete(ticketRef);
      });

      showToast(`Bilhete do minuto ${ticket.minuteLabel} de ${ticket.userName} excluído e reembolsado com sucesso!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao excluir o bilhete.', 'error');
    }
  };

  // Handle Finish Draw and Lançar Vencedor
  const handleFinishDraw = async () => {
    if (!finishingDraw) return;
    const minVal = parseInt(winningMinuteInput, 10);
    if (isNaN(minVal) || minVal < 1 || minVal > 100) {
      showToast('Por favor, informe um minuto válido de 1 a 100.', 'error');
      return;
    }

    setIsSubmittingWinner(true);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Get all tickets for this draw
        const ticketsQuery = query(
          collection(db, 'minuto_certo_tickets'),
          where('drawId', '==', finishingDraw.id),
          where('minuteValue', '==', minVal)
        );
        const ticketSnaps = await getDocs(ticketsQuery);
        
        let winnerId: string | null = null;
        let winnerName: string | null = null;

        if (!ticketSnaps.empty) {
          const winningTicket = ticketSnaps.docs[0].data() as MinutoCertoTicket;
          winnerId = winningTicket.userId;
          winnerName = winningTicket.userName;

          // 2. Fetch winner profile to credit prize
          const userRef = doc(db, 'users', winnerId);
          const userSnap = await transaction.get(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            const currentBalance = userData.balance || 0;
            const newBalance = currentBalance + finishingDraw.prize;

            // Update winner's balance
            transaction.update(userRef, { balance: newBalance });

            // Create Transaction receipt
            const transactionRef = doc(collection(db, 'transactions'));
            transaction.set(transactionRef, {
              userId: winnerId,
              type: 'prize',
              amount: finishingDraw.prize,
              status: 'confirmed',
              timestamp: serverTimestamp(),
              description: `Prêmio Minuto Certo - Partida: ${finishingDraw.matchName} (Minuto ${formatMinuteValue(minVal)})`
            });
          }
        } else {
          winnerName = 'Sem Vencedor';
        }

        // 3. Update draw status
        const drawRef = doc(db, 'minuto_certo_draws', finishingDraw.id);
        transaction.update(drawRef, {
          status: 'finished',
          winningMinute: minVal,
          winnerId: winnerId,
          winnerName: winnerName
        });
      });

      showToast('Sorteio encerrado e prêmio enviado ao vencedor com sucesso!', 'success');
      setFinishingDraw(null);
      setWinningMinuteInput('');
    } catch (err) {
      console.error(err);
      showToast('Erro ao encerrar sorteio e creditar prêmio.', 'error');
    } finally {
      setIsSubmittingWinner(false);
    }
  };

  // Handle Finish Draw Sem Vencedor (Nenhum Gol)
  const handleFinishDrawNoWinner = async () => {
    if (!finishingDraw) return;
    setIsSubmittingWinner(true);

    try {
      await runTransaction(db, async (transaction) => {
        const drawRef = doc(db, 'minuto_certo_draws', finishingDraw.id);
        transaction.update(drawRef, {
          status: 'finished',
          winningMinute: 0,
          winnerId: null,
          winnerName: 'Sem Vencedor (Nenhum Gol)'
        });
      });

      showToast('Sorteio encerrado sem vencedor com sucesso!', 'success');
      setFinishingDraw(null);
      setWinningMinuteInput('');
    } catch (err) {
      console.error(err);
      showToast('Erro ao encerrar sorteio sem vencedor.', 'error');
    } finally {
      setIsSubmittingWinner(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-5 py-4 rounded-2xl shadow-xl transition-all border font-sans text-sm font-semibold transform translate-y-0 scale-100 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/10' :
          toast.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-500/10' :
          'bg-amber-50 text-amber-800 border-amber-200 shadow-amber-500/10'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-rose-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
        <div>
          {!isSubcomponent && (
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
            </Link>
          )}
          <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-600">
              <Clock className="w-7 h-7" />
            </div>
            Gestão Minuto Certo
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Cadastre sorteios da Final da Copa, gerencie bilhetes vendidos e informe o minuto do 1° gol para creditar o vencedor.
          </p>
        </div>

        <button
          onClick={() => {
            setDrawForm({ matchName: '', date: '', time: '', price: 2, prize: 100 });
            setEditingDrawId(null);
            setShowDrawForm(!showDrawForm);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-2xl transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2 text-sm uppercase tracking-wider"
        >
          {showDrawForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showDrawForm ? 'Cancelar' : 'Cadastrar Sorteio'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sorteios Totais</span>
            <span className="text-2xl font-extrabold text-slate-800 block">{draws.length}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sorteios Ativos</span>
            <span className="text-2xl font-extrabold text-slate-800 block">
              {draws.filter(d => d.status === 'active').length}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-2xl text-amber-600">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bilhetes Vendidos</span>
            <span className="text-2xl font-extrabold text-slate-800 block">{tickets.length} (Sorteio Selecionado)</span>
          </div>
        </div>
      </div>

      {/* Save Draw Form */}
      {showDrawForm && (
        <form onSubmit={handleSaveDraw} className="bg-white p-8 rounded-3xl shadow-md border border-slate-200 space-y-6">
          <h2 className="text-xl font-display font-bold text-slate-850 flex items-center gap-2 border-b border-slate-50 pb-4">
            <Calendar className="w-5 h-5 text-indigo-600" />
            {editingDrawId ? 'Editar Sorteio Minuto Certo' : 'Cadastrar Sorteio Minuto Certo'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nome da Partida / Sorteio</label>
              <input
                type="text"
                placeholder="Ex: Final Copa do Mundo: Brasil x França"
                value={drawForm.matchName}
                onChange={e => setDrawForm({ ...drawForm, matchName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/25 outline-none text-slate-800 text-sm font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Data</label>
                <input
                  type="date"
                  value={drawForm.date}
                  onChange={e => setDrawForm({ ...drawForm, date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/25 outline-none text-slate-800 text-sm font-semibold"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Horário</label>
                <input
                  type="time"
                  value={drawForm.time}
                  onChange={e => setDrawForm({ ...drawForm, time: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/25 outline-none text-slate-800 text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Preço do Bilhete (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                value={drawForm.price}
                onChange={e => setDrawForm({ ...drawForm, price: parseFloat(e.target.value) || 2 })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/25 outline-none text-slate-800 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Prêmio do Ganhador (R$)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={drawForm.prize}
                onChange={e => setDrawForm({ ...drawForm, prize: parseFloat(e.target.value) || 100 })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/25 outline-none text-slate-800 text-sm font-semibold"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Observações (Valores de Prêmio, Regras Extras, etc.)</label>
              <textarea
                placeholder="Insira detalhes adicionais do prêmio, regras específicas, observações de acumulação ou restrições."
                value={drawForm.observations}
                onChange={e => setDrawForm({ ...drawForm, observations: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/25 outline-none text-slate-800 text-sm font-semibold min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-50 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowDrawForm(false);
                setEditingDrawId(null);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl transition-all text-xs uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md shadow-indigo-600/15 text-xs uppercase tracking-wider"
            >
              Salvar Sorteio
            </button>
          </div>
        </form>
      )}

      {/* Finish/End Sorteio Input Card */}
      {finishingDraw && (
        <div className="bg-amber-50/50 border border-amber-200 p-8 rounded-3xl space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-700">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900">Encerrar Sorteio & Lançar Ganhador</h3>
                <p className="text-xs text-amber-800/80 font-medium">Partida: {finishingDraw.matchName}</p>
              </div>
            </div>
            <button onClick={() => setFinishingDraw(null)} className="text-amber-700 hover:text-amber-900">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-md space-y-4">
            <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Minuto do 1° Gol (1 a 100)</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Informe de 1 a 100"
                  value={winningMinuteInput}
                  onChange={e => setWinningMinuteInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-amber-500/25"
                />
                <button
                  type="button"
                  onClick={handleFinishDraw}
                  disabled={isSubmittingWinner}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-md shadow-amber-600/10 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer"
                >
                  {isSubmittingWinner ? 'Processando...' : 'Lançar & Premiar'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleFinishDrawNoWinner}
                disabled={isSubmittingWinner}
                className="bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-md text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer"
              >
                Sem Vencedor (Sem Gols)
              </button>
            </div>
            <p className="text-[10px] text-amber-800 font-medium">
              * O sistema buscará o bilhete com o minuto correspondente, creditará R$ {finishingDraw.prize.toFixed(2)} ao ganhador e registrará a transação de forma totalmente segura e atômica.
            </p>
          </div>
        </div>
      )}

      {/* Draws List Table */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-xl font-display font-bold text-slate-850">Histórico de Sorteios</h2>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : draws.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">Nenhum sorteio cadastrado no Minuto Certo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-2">Partida / Sorteio</th>
                  <th className="py-4">Data / Hora</th>
                  <th className="py-4">Preço / Prêmio</th>
                  <th className="py-4">Minuto Sorteado</th>
                  <th className="py-4">Ganhador</th>
                  <th className="py-4">Status</th>
                  <th className="py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {draws.map(draw => (
                  <tr
                    key={draw.id}
                    onClick={() => setSelectedDrawId(draw.id)}
                    className={`border-b border-slate-50 cursor-pointer transition-colors ${
                      selectedDrawId === draw.id ? 'bg-indigo-50/30 font-semibold' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <td className="py-4 px-2">
                      <div className="font-bold text-slate-800 text-sm">{draw.matchName}</div>
                      {draw.observations && (
                        <div className="text-[10px] text-indigo-600 font-medium max-w-xs mt-1 italic break-words">
                          Obs: {draw.observations}
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="text-slate-600 text-sm font-semibold">
                        {draw.date.split('-').reverse().join('/')} às {draw.time}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="text-xs font-semibold text-slate-500">
                        Bilhete: <strong className="text-slate-700">R$ {draw.price.toFixed(2)}</strong>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        Prêmio: <strong className="text-emerald-700">R$ {draw.prize.toFixed(2)}</strong>
                      </div>
                    </td>
                    <td className="py-4">
                      {draw.status === 'finished' ? (
                        draw.winningMinute ? (
                          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg border border-indigo-150">
                            {formatMinuteValue(draw.winningMinute)} min ({getMinutePeriod(draw.winningMinute)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-slate-200">
                            Sem Gols
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-xs font-medium italic">Aguardando</span>
                      )}
                    </td>
                    <td className="py-4">
                      {draw.winnerName ? (
                        <div className="flex items-center gap-1">
                          <Award className={`w-4 h-4 ${draw.winnerId ? 'text-amber-500' : 'text-slate-400'}`} />
                          <span className="text-slate-800 text-xs font-bold">{draw.winnerName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium italic">-</span>
                      )}
                    </td>
                    <td className="py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${
                        draw.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {draw.status === 'active' ? 'Ativo' : 'Finalizado'}
                      </span>
                    </td>
                    <td className="py-4 text-right space-x-1.5" onClick={e => e.stopPropagation()}>
                      {draw.status === 'active' && (
                        <button
                          onClick={() => {
                            setFinishingDraw(draw);
                            setWinningMinuteInput('');
                          }}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors border border-amber-200"
                        >
                          Encerrar
                        </button>
                      )}
                      <button
                        onClick={() => handleEditClick(draw)}
                        className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors inline-block"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDraw(draw.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors inline-block"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket audit list */}
      {selectedDrawId && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-display font-bold text-slate-850">Bilhetes Vendidos</h2>
              <p className="text-xs text-slate-500 font-medium">Lista de minutos adquiridos pelos apostadores.</p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-150">
              Total: {tickets.length} vendidos
            </span>
          </div>

          {tickets.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium text-center py-6">Nenhum bilhete vendido para este sorteio ainda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {tickets.map(t => (
                <div key={t.id} className="bg-slate-50 border border-slate-250 rounded-2xl p-4 flex justify-between items-center hover:shadow-sm transition-all gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Apostador</span>
                    <span className="text-sm font-bold text-slate-800 block truncate" title={t.userName}>{t.userName}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Minuto Escolhido</span>
                    <span className="inline-flex items-center gap-1 bg-white text-indigo-900 border border-indigo-150 font-mono font-extrabold text-xs px-2 py-0.5 rounded-md mt-0.5 shadow-sm">
                      {t.minuteLabel} min ({getMinutePeriod(t.minuteValue)})
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteTicket(t)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Excluir Bilhete Vendido"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
