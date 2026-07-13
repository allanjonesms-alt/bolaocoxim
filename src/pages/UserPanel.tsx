import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Bet, Transaction, Match, PixPremiadoGame, MinutoCertoDraw, MinutoCertoTicket, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { QrCode, Wallet, ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2, Trophy, X, Copy, Check, Sparkles, Award, Calendar } from 'lucide-react';
import { formatMinuteValue, getMinutePeriod } from '../lib/utils';

export default function UserPanel() {
  const { user, profile } = useAuth();
  const [bets, setBets] = useState<(Bet & { match?: Match })[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [raffleGames, setRaffleGames] = useState<PixPremiadoGame[]>([]);
  
  // Minuto Certo states
  const [minutoDraws, setMinutoDraws] = useState<MinutoCertoDraw[]>([]);
  const [minutoTickets, setMinutoTickets] = useState<MinutoCertoTicket[]>([]);
  const [isPurchasingMinuto, setIsPurchasingMinuto] = useState(false);
  const [minutoToast, setMinutoToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [showPix, setShowPix] = useState(false);
  const [depositAmount, setDepositAmount] = useState('50');
  const [requestWithdraw, setRequestWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  
  const [pixKeyInput, setPixKeyInput] = useState('');
  const [isUpdatingPixKey, setIsUpdatingPixKey] = useState(false);

  useEffect(() => {
    if (profile?.pix_key) {
      setPixKeyInput(profile.pix_key);
    }
  }, [profile]);

  
  const pixCode = '00020126360014BR.GOV.BCB.PIX0114+55679843730395204000053039865802BR5901N6001C62140510BOLAOCOXIM63049152';

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    } catch (err) {
      console.error('Failed to copy Pix code', err);
    }
  };
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFinanceModal, setShowFinanceModal] = useState(false);

  useEffect(() => {
    if (searchParams.get('openFinance') === 'true') {
      setShowFinanceModal(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openFinance');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  useEffect(() => {
    if (!user) return;
    
    const qBets = query(collection(db, 'bets'), where('userId', '==', user.uid));
    const unsubBets = onSnapshot(qBets, async (snapshot) => {
      const betsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Bet));
      setBets(betsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bets'));
    
    const qTrans = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const transData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      transData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransactions(transData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      setMatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Match)));
    });

    const qRaffle = query(collection(db, 'pix_premiado_games'), where('userId', '==', user.uid));
    const unsubRaffle = onSnapshot(qRaffle, (snapshot) => {
      const raffleData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PixPremiadoGame));
      setRaffleGames(raffleData);
    });

    const unsubMC_Draws = onSnapshot(collection(db, 'minuto_certo_draws'), (snapshot) => {
      const mcDrawsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MinutoCertoDraw));
      setMinutoDraws(mcDrawsData);
    });

    const unsubMC_Tickets = onSnapshot(collection(db, 'minuto_certo_tickets'), (snapshot) => {
      const mcTicketsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MinutoCertoTicket));
      setMinutoTickets(mcTicketsData);
    });

    return () => { unsubBets(); unsubTrans(); unsubMatches(); unsubRaffle(); unsubMC_Draws(); unsubMC_Tickets(); };
  }, [user]);

  const handleDepositRequest = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    try {
      await addDoc(collection(db, 'pix_requests'), {
        userId: user!.uid,
        userName: profile.name,
        amount,
        type: 'deposit',
        verified: false,
        timestamp: serverTimestamp()
      });
      setShowPix(true);
    } catch(err) {
      console.error(err);
      setShowPix(true); // show pix anyway
    }
  };

  const handleConfirmPayment = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user!.uid,
        type: 'deposit',
        amount,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setShowPix(false);
      alert('Seu depósito de R$ ' + amount.toFixed(2) + ' foi registrado como PENDENTE e aguarda validação do administrador!');
    } catch(err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    }
  };

  const handleBuyMinutoTicket = async (drawId: string) => {
    if (!user || !profile) return;
    const draw = minutoDraws.find(d => d.id === drawId);
    if (!draw) return;

    if (draw.status !== 'active') {
      setMinutoToast({ message: 'Este sorteio já está encerrado!', type: 'error' });
      setTimeout(() => setMinutoToast(null), 4000);
      return;
    }

    const currentBalance = profile.balance || 0;
    if (currentBalance < draw.price) {
      setMinutoToast({ message: `Saldo insuficiente! Recarregue pelo menos R$ ${draw.price.toFixed(2)}.`, type: 'error' });
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

      // 2. Select a random available minute
      const randomIndex = Math.floor(Math.random() * availableMinutes.length);
      const chosenMinute = availableMinutes[randomIndex];
      const chosenLabel = formatMinuteValue(chosenMinute);

      // 3. Run Transaction
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error('Perfil de usuário não encontrado.');
        
        const freshProfile = userSnap.data() as UserProfile;
        const freshBalance = freshProfile.balance || 0;

        if (freshBalance < draw.price) {
          throw new Error('Saldo insuficiente (atualizado)');
        }

        // Check if ticket document with this minute already exists
        const ticketDocId = `${drawId}_${chosenMinute}`;
        const ticketRef = doc(db, 'minuto_certo_tickets', ticketDocId);
        const ticketSnap = await transaction.get(ticketRef);
        if (ticketSnap.exists()) {
          throw new Error('Este minuto foi adquirido por outro jogador nesse instante. Tente novamente!');
        }

        // Deduct balance
        const newBalance = freshBalance - draw.price;
        transaction.update(userRef, { balance: newBalance });

        // Save Ticket
        transaction.set(ticketRef, {
          drawId,
          userId: user.uid,
          userName: profile.name,
          minuteValue: chosenMinute,
          minuteLabel: chosenLabel,
          price: draw.price,
          createdAt: serverTimestamp()
        });

        // Create transaction receipt
        const transRef = doc(collection(db, 'transactions'));
        transaction.set(transRef, {
          userId: user.uid,
          type: 'bet',
          amount: -draw.price,
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          description: `Compra Bilhete Minuto Certo - Minuto: ${chosenLabel} (Partida: ${draw.matchName})`
        });
      });

      setMinutoToast({ message: `Sucesso! Você adquiriu o minuto ${chosenLabel}!`, type: 'success' });
      setTimeout(() => setMinutoToast(null), 4000);
    } catch (err: any) {
      console.error(err);
      setMinutoToast({ message: err.message || 'Erro ao realizar a compra.', type: 'error' });
      setTimeout(() => setMinutoToast(null), 4000);
    } finally {
      setIsPurchasingMinuto(false);
    }
  };

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > profile!.balance) {
      alert('Valor inválido ou saldo insuficiente.');
      return;
    }

    const currentPixKey = (profile?.pix_key || pixKeyInput || '').trim();
    if (!currentPixKey) {
      alert('Chave PIX obrigatória. Por favor, digite sua chave PIX para podermos efetuar a transferência.');
      return;
    }
    
    try {
      if (profile?.pix_key !== currentPixKey) {
        await updateDoc(doc(db, 'users', user!.uid), {
          pix_key: currentPixKey
        });
      }

      await addDoc(collection(db, 'transactions'), {
        userId: user!.uid,
        type: 'withdrawal',
        amount,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setRequestWithdraw(false);
      setWithdrawAmount('');
      alert('Solicitação de saque enviada com sucesso! O administrador fará a transferência e debitará de seu saldo.');
    } catch(err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    }
  };

  const handleUpdatePixKey = async () => {
    if (!user) return;
    setIsUpdatingPixKey(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        pix_key: pixKeyInput
      });
      alert('Chave PIX atualizada com sucesso!');
    } catch(err) {
      console.error(err);
      alert('Erro ao atualizar a chave PIX.');
    } finally {
      setIsUpdatingPixKey(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <h1 className="text-3xl font-display font-bold text-slate-800 tracking-tight">Painel do Usuário</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 md:col-span-1 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none"></div>
          
          <div className="h-24 w-24 bg-emerald-50 border-2 border-emerald-500/25 text-emerald-600 rounded-full flex items-center justify-center text-4xl font-display font-bold mb-5 shadow-sm relative z-10">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-display font-bold text-slate-800 relative z-10 flex items-center gap-2">
            <span className="text-emerald-600">#{profile.displayId || '---'}</span>
            <span>{profile.name}</span>
          </h2>
          <p className="text-slate-500 text-sm mb-4 font-medium relative z-10">{profile.email}</p>
          
          <div className="w-full relative z-10 mb-8 border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col text-left">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Sua Chave PIX (Para Saques)</span>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={pixKeyInput}
                 onChange={e => setPixKeyInput(e.target.value)}
                 placeholder="Insira sua chave PIX..."
                 className="w-full text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
               />
               <button 
                 onClick={handleUpdatePixKey}
                 disabled={isUpdatingPixKey || pixKeyInput === (profile.pix_key || '')}
                 className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
               >
                 Salvar
               </button>
             </div>
          </div>
          
          <button 
            id="balance-button-userpanel"
            onClick={() => setShowFinanceModal(true)}
            className="w-full bg-slate-50 hover:bg-slate-100/80 p-5 rounded-2xl border border-slate-200 hover:border-emerald-500/30 transition-all flex flex-col items-center relative z-10 group cursor-pointer focus:outline-none"
          >
            <span className="text-sm font-semibold text-slate-555 group-hover:text-emerald-700 transition-colors uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-emerald-600" /> Saldo Disponível
            </span>
            <span className="text-4xl font-bold text-emerald-700 font-mono group-hover:scale-105 transition-transform duration-200">
              R$ {(profile.balance ?? 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 mt-2 group-hover:text-slate-500 transition-colors">
              Clique para depositar ou sacar
            </span>
          </button>
        </div>

        {/* Banking Controls */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 md:col-span-2 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-[60px] pointer-events-none"></div>
          
          <h3 className="text-xl font-display font-bold text-slate-850 mb-6 flex items-center relative z-10">
            <Wallet className="h-6 w-6 mr-3 text-slate-500" />
            Movimentação Financeira
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1 relative z-10">
            {/* Deposit */}
            <div className="bg-slate-50/60 border border-emerald-100/85 rounded-2xl p-6 flex flex-col shadow-inner">
              <h4 className="font-bold text-slate-800 mb-2 flex items-center text-lg">
                <ArrowDownToLine className="h-5 w-5 mr-2 text-emerald-600" /> Depositar
              </h4>
              <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">Adicione créditos para fazer apostas. Suas apostas pendentes serão confirmadas automaticamente.</p>
              
              {!showPix ? (
                <div className="mt-auto space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                    <input 
                      type="number" 
                      value={depositAmount} 
                      onChange={e => setDepositAmount(e.target.value)} 
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/35 text-slate-800 font-mono font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                  <button onClick={handleDepositRequest} className="w-full bg-emerald-605 hover:bg-emerald-705 text-white font-bold rounded-xl py-3.5 transition-colors shadow-md shadow-emerald-500/10 cursor-pointer">
                    Gerar PIX
                  </button>
                </div>
              ) : (
                <div className="mt-auto flex flex-col items-center bg-white p-5 rounded-xl border border-emerald-100 relative shadow-sm">
                  <img 
                    src="https://lh3.googleusercontent.com/d/1b4csBjKmNy33G5G1lo3lB_Alfb-_bzkf" 
                    alt="PIX QR Code" 
                    className="w-48 h-48 object-contain mb-3 rounded-lg" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://docs.google.com/uc?export=download&id=1b4csBjKmNy33G5G1lo3lB_Alfb-_bzkf";
                    }}
                  />
                  <p className="text-xs text-center text-slate-600 font-medium mb-3">Escaneie o QR Code no seu app de banco.</p>
                  
                  {/* Pix Copia e Cola */}
                  <div className="w-full mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Pix Copia e Cola</span>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={pixCode} 
                        className="w-full text-xs font-mono text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none select-all overflow-hidden text-ellipsis"
                      />
                      <button 
                        onClick={handleCopyPix}
                        type="button"
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
                          copiedPix 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                        title="Copiar Código Pix"
                      >
                        {copiedPix ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedPix ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={handleConfirmPayment}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-2.5 px-4 transition-colors text-sm uppercase shadow-md mb-2 cursor-pointer"
                  >
                    EFETUEI O PAGAMENTO
                  </button>
                  <button 
                    onClick={() => setShowPix(false)} 
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Withdraw */}
            <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-6 flex flex-col shadow-inner">
              <h4 className="font-bold text-slate-800 mb-2 flex items-center text-lg">
                <ArrowUpFromLine className="h-5 w-5 mr-2 text-slate-555" /> Sacar
              </h4>
              <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">Solicite o saque do seu saldo. O administrador fará a transferência para sua chave PIX.</p>
              
              {!requestWithdraw ? (
                <button onClick={() => setRequestWithdraw(true)} className="mt-auto w-full bg-slate-150 hover:bg-slate-250 text-slate-700 border border-slate-200/80 rounded-xl py-3.5 font-bold transition-colors cursor-pointer">
                  Solicitar Saque
                </button>
              ) : (
                <div className="mt-auto space-y-4">
                  {!(profile?.pix_key || '').trim() && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Chave PIX Obrigatória para Receber o Saque</label>
                      <input 
                        type="text" 
                        value={pixKeyInput} 
                        onChange={e => setPixKeyInput(e.target.value)} 
                        placeholder="Digite sua chave PIX aqui..."
                        className="w-full px-4 py-2.5 bg-white border border-red-200 focus:border-red-450 rounded-xl outline-none text-slate-800 text-xs font-mono"
                      />
                    </div>
                  )}
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                    <input 
                      type="number" 
                      value={withdrawAmount} 
                      onChange={e => setWithdrawAmount(e.target.value)} 
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/35 text-slate-800 font-mono font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={handleWithdrawRequest} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-3.5 transition-colors cursor-pointer">
                      Confirmar
                    </button>
                    <button onClick={() => setRequestWithdraw(false)} className="px-5 bg-slate-200 hover:bg-slate-300 text-slate-705 rounded-xl font-bold transition-colors border border-slate-250 cursor-pointer">
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 relative overflow-hidden">
          <h3 className="text-xl font-display font-bold text-slate-800 mb-6 flex items-center">
            Minhas Apostas
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {bets.length === 0 ? <p className="text-sm text-slate-400 font-medium text-center py-8">Nenhuma aposta realizada.</p> : bets.map(bet => {
              const m = matches.find(match => match.id === bet.matchId);
              return (
                <div key={bet.id} className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex justify-between items-center hover:border-slate-250 transition-colors">
                  <div>
                    {m && (
                      <div className="text-xs text-slate-505 font-semibold mb-1.5 flex items-center gap-1.5">
                        <span>{m.team1}</span>
                        {m.flag1?.startsWith('http') || m.flag1?.startsWith('data:') ? (
                          <img src={m.flag1} alt={m.team1} className="w-4 h-2.5 object-cover rounded-sm border border-slate-100" referrerPolicy="no-referrer" />
                        ) : (
                          <span>{m.flag1}</span>
                        )}
                        <span className="text-slate-400 font-bold">vs</span>
                        {m.flag2?.startsWith('http') || m.flag2?.startsWith('data:') ? (
                          <img src={m.flag2} alt={m.team2} className="w-4 h-2.5 object-cover rounded-sm border border-slate-100" referrerPolicy="no-referrer" />
                        ) : (
                          <span>{m.flag2}</span>
                        )}
                        <span>{m.team2}</span>
                      </div>
                    )}
                    <div className="text-slate-800 font-extrabold text-lg font-mono mb-1">Palpite: {bet.predicted1} <span className="text-slate-400">x</span> {bet.predicted2}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
                        Status: 
                        <span className={bet.status === 'pending' ? 'text-orange-500 ml-1 font-bold' : 'text-emerald-700 ml-1 font-extrabold'}>
                          {bet.status === 'pending' ? 'Pendente' : 'Confirmada'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${bet.paid ? 'bg-emerald-50 text-emerald-705 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {bet.paid ? 'Pago' : 'Sem Saldo'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Aposta</div>
                    <div className="text-base font-extrabold font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">R$ {bet.amount.toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Seção PIX PREMIADO */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[50px] pointer-events-none"></div>
          
          <h3 className="text-xl font-display font-bold text-slate-850 mb-2 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            Seus Bilhetes - PIX PREMIADO
          </h3>
          <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
            Seus bilhetes adquiridos para o sorteio especial do PIX PREMIADO. Cada jogo possui dezenas e quadras exclusivas, garantindo premiações únicas!
          </p>

          {raffleGames.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              Você não possui nenhum bilhete no sorteio ativo. Adquira com o administrador!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {raffleGames.map(game => (
                <div key={game.id} className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-200 transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Bilhete Ativo</span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {game.createdAt ? (game.createdAt.toDate ? game.createdAt.toDate().toLocaleDateString('pt-BR') : new Date(game.createdAt).toLocaleDateString('pt-BR')) : '-'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 justify-center mb-3">
                    {game.numbers.map((num, i) => (
                      <span key={i} className="w-8 h-8 rounded-full bg-white text-indigo-850 font-mono font-bold text-xs flex items-center justify-center border border-indigo-200 shadow-sm">
                        {String(num).padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-indigo-900/60 font-semibold border-t border-indigo-100/60 pt-2">
                    <span>Custo do Bilhete:</span>
                    <span className="font-mono font-bold text-indigo-700">R$ {game.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção MINUTO CERTO */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[50px] pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
            <div>
              <h3 className="text-xl font-display font-bold text-slate-850 flex items-center gap-2">
                <Clock className="h-6 w-6 text-amber-600" />
                Minuto Certo
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                Adquira bilhetes por R$ 2,00 e ganhe R$ 100,00 se o 1° gol da partida sair no seu minuto exclusivo!
              </p>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
              Prêmio: R$ 100,00
            </span>
          </div>

          {/* Minuto Certo Toast Notification */}
          {minutoToast && (
            <div className={`mb-6 p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 animate-fade-in ${
              minutoToast.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {minutoToast.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-rose-600" />}
              <span>{minutoToast.message}</span>
            </div>
          )}

          {minutoDraws.filter(d => d.status === 'active').length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-semibold">Nenhum sorteio de Minuto Certo ativo no momento.</p>
              <p className="text-xs text-slate-400 mt-0.5">Fique atento para as próximas partidas da Final!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {minutoDraws.filter(d => d.status === 'active').map(draw => {
                const drawTickets = minutoTickets.filter(t => t.drawId === draw.id);
                const myTickets = drawTickets.filter(t => t.userId === user?.uid);
                // Sort by minute value ascending
                const sortedMyTickets = [...myTickets].sort((a, b) => a.minuteValue - b.minuteValue);
                const isBoardOpen = true; // Let's keep the board open or add a toggle if needed

                return (
                  <div key={draw.id} className="bg-slate-50/50 border border-slate-250/60 rounded-3xl p-6 space-y-6 hover:border-amber-200 transition-colors">
                    {/* Draw Header Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Partida Oficial</span>
                        <h4 className="text-base font-extrabold text-slate-800">{draw.matchName}</h4>
                        <span className="text-xs font-semibold text-slate-400 mt-0.5 block">
                          {draw.date.split('-').reverse().join('/')} às {draw.time}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:items-end gap-1.5">
                        <span className="text-xs font-bold text-slate-500">Custo: R$ {draw.price.toFixed(2)} / cada</span>
                        <button
                          onClick={() => handleBuyMinutoTicket(draw.id)}
                          disabled={isPurchasingMinuto}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-indigo-600/10 text-xs uppercase tracking-wider whitespace-nowrap self-start sm:self-auto"
                        >
                          {isPurchasingMinuto ? 'Processando...' : 'Adquirir Bilhete Aleatório'}
                        </button>
                      </div>
                    </div>

                    {/* User's purchased tickets list */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        Seus Minutos Adquiridos ({sortedMyTickets.length})
                      </h5>
                      {sortedMyTickets.length === 0 ? (
                        <p className="text-xs text-slate-400 font-medium italic">Você ainda não adquiriu nenhum minuto para este sorteio.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {sortedMyTickets.map(ticket => (
                            <span
                              key={ticket.id}
                              className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-850 font-mono font-extrabold text-xs px-3 py-1.5 rounded-xl border border-amber-200 shadow-sm"
                            >
                              <Trophy className="w-3.5 h-3.5 text-amber-500" />
                              {ticket.minuteLabel} min ({getMinutePeriod(ticket.minuteValue)})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Visual Availability Board */}
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Mapa do Sorteio (1 a 100 minutos)
                      </h5>
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
                                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/15'
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
                      <div className="flex gap-4 text-[10px] font-bold text-slate-400 mt-2">
                        <div className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 border border-emerald-600 inline-block"></span>
                          <span>Adquirido por você</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-200 inline-block"></span>
                          <span>Vendido</span>
                        </div>
                        <div className="flex items-center gap-1">
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

        <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 relative overflow-hidden">
          <h3 className="text-xl font-display font-bold text-slate-850 mb-6 flex items-center">
            Histórico de Transações
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {transactions.length === 0 ? <p className="text-sm text-slate-400 font-medium text-center py-8">Nenhuma transação.</p> : transactions.map(t => (
              <div key={t.id} className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex justify-between items-center hover:border-slate-250 transition-colors">
                <div className="flex items-center">
                  <div className={`p-3 rounded-xl mr-4 border ${
                    t.status === 'pending' 
                      ? 'bg-orange-50 border-orange-200' 
                      : t.status === 'rejected'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-emerald-50 border-emerald-100'
                  }`}>
                    {t.status === 'pending' ? (
                      <Clock className="h-5 w-5 text-orange-600" />
                    ) : t.status === 'rejected' ? (
                      <X className="h-5 w-5 text-red-650" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-650" />
                    )}
                  </div>
                  <div>
                    <div className="text-slate-805 font-extrabold capitalize text-base tracking-wide flex flex-col sm:flex-row sm:items-center gap-2">
                      <span>
                        {t.type === 'deposit' ? 'Depósito' : 
                         t.type === 'withdrawal' ? 'Saque' : 
                         t.type === 'manual_deduction' ? 'Remoção de Saldo' :
                         t.type === 'prize' ? 'Prêmio Recebido' : 'Aposta'}
                      </span>
                      {t.status === 'pending' && t.type === 'deposit' && (
                        <span className="text-[10px] uppercase font-bold text-orange-650 bg-orange-55 border border-orange-200 px-2.5 py-0.5 rounded-full inline-block">
                          PENDENTE (Aprovação do admin)
                        </span>
                      )}
                      {t.status === 'pending' && t.type === 'withdrawal' && (
                        <span className="text-[10px] uppercase font-bold text-amber-800 bg-yellow-50 border border-yellow-200 px-2.5 py-0.5 rounded-full inline-block">
                          Aguardando Saque
                        </span>
                      )}
                      {t.status === 'rejected' && (
                        <span className="text-[10px] uppercase font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full inline-block">
                          Recusada
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-450 mt-1 font-semibold">{new Date(t.timestamp).toLocaleDateString()}</div>
                    {t.type === 'withdrawal' && t.status === 'confirmed' && t.pixReceiptDate && (
                      <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 mt-1.5 px-2 py-0.5 rounded-md inline-block font-bold">
                        PIX realizado em: {new Date(t.pixReceiptDate).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                <div className={`text-lg font-mono font-bold px-3 py-1 rounded-lg border ${
                  ['deposit', 'prize'].includes(t.type) ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-slate-655 bg-slate-100 border border-slate-205'
                }`}>
                  {['deposit', 'prize'].includes(t.type) ? '+' : '-'} R$ {t.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Finance Movement Modal */}
      {showFinanceModal && (
        <div id="finance-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 sm:p-8">
            <button 
              onClick={() => setShowFinanceModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-650 transition p-2 bg-slate-105 rounded-full hover:bg-slate-200 cursor-pointer"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-2xl font-display font-bold text-slate-800 mb-6 flex items-center">
              <Wallet className="h-7 w-7 mr-3 text-emerald-600" />
              Movimentação Financeira
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Deposit */}
              <div className="bg-slate-50/60 border border-emerald-100/85 rounded-2xl p-6 flex flex-col shadow-inner">
                <h4 className="font-bold text-slate-800 mb-2 flex items-center text-lg">
                  <ArrowDownToLine className="h-5 w-5 mr-2 text-emerald-600" /> Depositar
                </h4>
                <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">Adicione créditos para fazer apostas. Suas apostas pendentes serão confirmadas automaticamente.</p>
                
                {!showPix ? (
                  <div className="mt-auto space-y-4">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                      <input 
                        type="number" 
                        value={depositAmount} 
                        onChange={e => setDepositAmount(e.target.value)} 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/35 text-slate-850 font-mono font-bold"
                        placeholder="0.00"
                      />
                    </div>
                    <button onClick={handleDepositRequest} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-3.5 transition-colors shadow-md shadow-emerald-550/10 cursor-pointer">
                      Gerar PIX
                    </button>
                  </div>
                ) : (
                  <div className="mt-auto flex flex-col items-center bg-white p-5 rounded-xl border border-emerald-100 relative animate-fade-in shadow-sm">
                    <img 
                      src="https://lh3.googleusercontent.com/d/1b4csBjKmNy33G5G1lo3lB_Alfb-_bzkf" 
                      alt="PIX QR Code" 
                      className="w-48 h-48 object-contain mb-3 rounded-lg" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://docs.google.com/uc?export=download&id=1b4csBjKmNy33G5G1lo3lB_Alfb-_bzkf";
                      }}
                    />
                    <p className="text-xs text-center text-slate-700 font-semibold mb-3">Escaneie o QR Code no seu app de banco.</p>
                    
                    {/* Pix Copia e Cola */}
                    <div className="w-full mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col text-left">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Pix Copia e Cola</span>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={pixCode} 
                          className="w-full text-xs font-mono text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none select-all overflow-hidden text-ellipsis"
                        />
                        <button 
                          onClick={handleCopyPix}
                          type="button"
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
                            copiedPix 
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          title="Copiar Código Pix"
                        >
                          {copiedPix ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedPix ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={handleConfirmPayment}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-2.5 px-4 transition-colors text-sm uppercase shadow-md mb-2 cursor-pointer"
                    >
                      EFETUEI O PAGAMENTO
                    </button>
                    <button 
                      onClick={() => setShowPix(false)} 
                      className="text-xs font-bold text-slate-400 hover:text-slate-650 uppercase tracking-wider cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Withdraw */}
              <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-6 flex flex-col shadow-inner">
                <h4 className="font-bold text-slate-800 mb-2 flex items-center text-lg">
                  <ArrowUpFromLine className="h-5 w-5 mr-2 text-slate-505" /> Sacar
                </h4>
                <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">Solicite o saque do seu saldo. O administrador fará a transferência para sua chave PIX.</p>
                
                {!requestWithdraw ? (
                  <button onClick={() => setRequestWithdraw(true)} className="mt-auto w-full bg-slate-200 hover:bg-slate-250 text-slate-700 border border-slate-250 rounded-xl py-3.5 font-bold transition-colors cursor-pointer">
                    Solicitar Saque
                  </button>
                ) : (
                  <div className="mt-auto space-y-4">
                    {!(profile?.pix_key || '').trim() && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Chave PIX Obrigatória para Receber o Saque</label>
                        <input 
                          type="text" 
                          value={pixKeyInput} 
                          onChange={e => setPixKeyInput(e.target.value)} 
                          placeholder="Digite sua chave PIX aqui..."
                          className="w-full px-4 py-2.5 bg-white border border-red-200 focus:border-red-450 rounded-xl outline-none text-slate-800 text-xs font-mono"
                        />
                      </div>
                    )}
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                      <input 
                        type="number" 
                        value={withdrawAmount} 
                        onChange={e => setWithdrawAmount(e.target.value)} 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/35 text-slate-800 font-mono font-semibold"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button onClick={handleWithdrawRequest} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-3.5 transition-colors cursor-pointer">
                        Confirmar
                      </button>
                      <button onClick={() => setRequestWithdraw(false)} className="px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors border border-slate-250 cursor-pointer">
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setShowFinanceModal(false)}
                className="bg-slate-150 hover:bg-slate-250 text-slate-705 px-6 py-2.5 rounded-xl text-sm font-bold border border-slate-250 transition duration-150 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
