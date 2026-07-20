import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Trophy, Clock, Coins, ShieldCheck, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import googleScoreboardImg from '../assets/images/google_scoreboard_1783945113545.jpg';

// Teste de alteração para verificação de sincronização e commit no GitHub
export default function Regulations() {
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      className="max-w-4xl mx-auto space-y-8 animate-fade-in"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Banner */}
      <motion.div 
        variants={itemVariants}
        className="relative bg-gradient-to-r from-emerald-800 to-emerald-950 p-8 sm:p-10 rounded-3xl shadow-lg border border-yellow-400/20 overflow-hidden text-left"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/10 rounded-full blur-[90px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-yellow-400/20 text-yellow-350 border border-yellow-400/30 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">Informativo Geral</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-yellow-300 shrink-0" />
              Regulamento do Bolão
            </h1>
            <p className="text-emerald-100/80 text-sm sm:text-base font-medium max-w-2xl">
              Entenda como funciona o PIXCOXIM: divisão de prêmios, prazos inegociáveis, acúmulos para a Seleção Brasileira e regras de homologação.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        
        {/* Rule 1: Divisão de prêmios */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-500/50 transition-all duration-300 relative group flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-xs">
              <Coins className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-display font-bold text-slate-800 uppercase tracking-wider">Divisão de Valores</h2>
            <div className="text-slate-600 text-sm leading-relaxed space-y-3">
              <p>
                Cada palpite registrado e homologado no bolão possui o valor fixo de <strong>R$ 5,00</strong> por aposta.
              </p>
              <p>
                <strong>90% de todo o valor arrecadado</strong> em cada confronto é destinado exclusivamente para a premiação líquida aos acertadores daquele jogo específico.
              </p>
              <p>
                A premiação correspondente é dividida em partes <strong>rigorosamente iguais</strong> entre todas as apostas com o palpite exato do placar final (Ganhadores).
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-6 pt-4 flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">90% para o Prêmio</span>
            <span className="text-xs font-bold text-emerald-600 font-mono">10% de Taxa Administrativa</span>
          </div>
        </motion.div>

        {/* Rule 2: Regra de Acúmulo */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-500/50 transition-all duration-300 relative group flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-xs">
              <Trophy className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-display font-bold text-slate-800 uppercase tracking-wider">Acúmulo de Prêmios</h2>
            <div className="text-slate-600 text-sm leading-relaxed space-y-3">
              <p>
                Se <strong>não houver nenhum acertador</strong> do placar exato de um jogo, o prêmio não é estornado nem faturado para a administração!
              </p>
              <p className="border-l-4 border-yellow-400 pl-3 py-1 bg-yellow-50/50 rounded-r-lg">
                Todo o valor destinado ao prêmio da partida é <strong>totalmente acumulado</strong> para a próxima partida da <strong>Seleção Brasileira</strong>.
              </p>
              <p>
                Excepcionalmente, caso não haja mais nenhuma partida programada da nossa seleção no calendário letivo do bolão, o montante total arrecadado acumulará diretamente para a premiação final da <strong>Classificação Geral</strong>.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-6 pt-4 flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Garantia de Ganho</span>
            <span className="text-xs font-bold text-amber-700">Acúmulo Inteligente</span>
          </div>
        </motion.div>

        {/* Rule 3: Prazo das Apostas */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-500/50 transition-all duration-300 relative group flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-xs">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-display font-bold text-slate-800 uppercase tracking-wider">Validade e Prazos</h2>
            <div className="text-slate-600 text-sm leading-relaxed space-y-3">
              <p>
                A pontualidade é mandatória para garantir a lisura, auditoria e equilíbrio do nosso PIXCOXIM.
              </p>
              <p className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50/50 rounded-r-lg">
                As apostas e palpites só serão considerados válidos se forem completamente <strong>confirmados até 30 minutos antes do início oficial</strong> de cada jogo.
              </p>
              <p>
                O sistema implementa barreiras digitais auto-executáveis de tempo: após o prazo (-30 min), novos palpites e pagamentos para a devida partida serão desativados.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-6 pt-4 flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Prazos de Jogo</span>
            <span className="text-xs font-bold text-blue-700">Bloqueio Automático (-30 min)</span>
          </div>
        </motion.div>

        {/* Rule 4: Homologação e Saldo */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-500/50 transition-all duration-300 relative group flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xs">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-display font-bold text-slate-800 uppercase tracking-wider">Aprovação e Saldo</h2>
            <div className="text-slate-600 text-sm leading-relaxed space-y-3">
              <p>
                Quando você salva uma aposta, se houver saldo válido (R$ 5,00 ou R$ 2,00 dependendo do tipo da aposta), ela é <strong>aprovada automaticamente pelo sistema</strong>.
              </p>
              <p>
                Apostas para as quais não haja saldo regular suficiente entrarão no sistema sob o rótulo de <strong>Aposta Pendente</strong>.
              </p>
              <p>
                Certifique-se de preencher seus fundos de forma adequada na área do jogador realizando um Pix e solicitando a aprovação do depósito ao suporte administrador.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-6 pt-4 flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Auditoria Clara</span>
            <span className="text-xs font-bold text-indigo-700">Garantia Antifraude</span>
          </div>
        </motion.div>

        {/* Rule 5: Jogos Promocionais */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-indigo-200 hover:border-indigo-500/50 transition-all duration-300 relative group flex flex-col justify-between md:col-span-2"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xs">
              <Trophy className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-display font-bold text-indigo-800 uppercase tracking-wider">Jogos Promocionais</h2>
            <div className="text-slate-600 text-sm leading-relaxed space-y-3">
              <p>
                Os Jogos Promocionais são uma modalidade especial que <strong>não distribui prêmios em dinheiro</strong>, mas serve exclusivamente para somar pontos na <strong>Classificação Geral</strong>.
              </p>
              <p className="border-l-4 border-indigo-500 pl-3 py-1 bg-indigo-50/50 rounded-r-lg">
                O custo para registrar um palpite nesta modalidade é de apenas <strong>R$ 2,00</strong>.
              </p>
              <p>
                Cada usuário tem um limite máximo de <strong>2 apostas</strong> por partida em jogos promocionais. Metade dos valores arrecadados nessas partidas são adicionados ao caixa para a grande premiação da Classificação Geral!
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-6 pt-4 flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Pontuação na Liga</span>
            <span className="text-xs font-bold text-indigo-700">R$ 2,00 por Palpite</span>
          </div>
        </motion.div>

        {/* Rule 6: Sistema de Pontuação */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-fuchsia-500/50 transition-all duration-300 relative group flex flex-col justify-between md:col-span-2"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 border border-fuchsia-100 flex items-center justify-center text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white transition-all duration-300 shadow-xs">
              <Trophy className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-display font-bold text-slate-800 uppercase tracking-wider">Sistema de Pontuação</h2>
            <div className="text-slate-600 text-sm leading-relaxed space-y-3">
              <p>
                A pontuação para a classificação geral recompensa acertos parciais. Você soma pontos ao acertar o vencedor (ou se foi empate) e ao acertar a quantidade exata de gols de cada equipe.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="border border-emerald-100 bg-emerald-50/50 rounded-2xl p-4">
                  <h3 className="font-bold text-emerald-800 mb-3">Jogos Principais (R$ 5,00)</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100/50 shadow-sm"><span className="text-xs font-semibold">Acertar o Vencedor (ou Empate)</span> <span className="font-bold text-emerald-700 bg-emerald-100 px-2 rounded">+6 pts</span></li>
                    <li className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100/50 shadow-sm"><span className="text-xs font-semibold">Acertar Gols da Equipe Mandante</span> <span className="font-bold text-emerald-700 bg-emerald-100 px-2 rounded">+12 pts</span></li>
                    <li className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100/50 shadow-sm"><span className="text-xs font-semibold">Acertar Gols da Equipe Visitante</span> <span className="font-bold text-emerald-700 bg-emerald-100 px-2 rounded">+12 pts</span></li>
                  </ul>
                  <div className="mt-4 text-xs text-center font-bold text-emerald-900 bg-emerald-200 py-2 rounded-xl">Acerto do Placar Exato: 30 pontos no total</div>
                </div>

                <div className="border border-indigo-100 bg-indigo-50/50 rounded-2xl p-4">
                  <h3 className="font-bold text-indigo-800 mb-3">Jogos Promocionais (R$ 2,00)</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-indigo-100/50 shadow-sm"><span className="text-xs font-semibold">Acertar o Vencedor (ou Empate)</span> <span className="font-bold text-indigo-700 bg-indigo-100 px-2 rounded">+2 pts</span></li>
                    <li className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-indigo-100/50 shadow-sm"><span className="text-xs font-semibold">Acertar Gols da Equipe Mandante</span> <span className="font-bold text-indigo-700 bg-indigo-100 px-2 rounded">+4 pts</span></li>
                    <li className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-indigo-100/50 shadow-sm"><span className="text-xs font-semibold">Acertar Gols da Equipe Visitante</span> <span className="font-bold text-indigo-700 bg-indigo-100 px-2 rounded">+4 pts</span></li>
                  </ul>
                  <div className="mt-4 text-xs text-center font-bold text-indigo-900 bg-indigo-200 py-2 rounded-xl">Acerto do Placar Exato: 10 pontos no total</div>
                </div>
              </div>

              <div className="mt-4 border-l-4 border-fuchsia-500 pl-3 py-2 bg-fuchsia-50/50 rounded-r-lg">
                <p className="text-sm text-fuchsia-900 leading-relaxed font-medium">
                  <strong>⚠️ Pontuação em Dobro:</strong> Daqui até o final do campeonato, as pontuações de todos os jogos são <strong>DOBRADAS</strong>! Os valores acima já refletem essa pontuação updated. O custo do jogo promocional está fixado em <strong>R$ 2,00</strong>.
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-6 pt-4 flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Classificação Geral</span>
            <span className="text-xs font-bold text-fuchsia-700">Soma Automática</span>
          </div>
        </motion.div>

        {/* Rule 7: Minuto Certo - Hidden at user request */}
        {false && (
          <motion.div 
            variants={itemVariants}
            className="bg-gradient-to-br from-amber-500/10 via-white to-white border border-amber-300/60 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 relative group flex flex-col justify-between md:col-span-2 text-left"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-xs">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Sorteio Exclusivo</span>
                  <h2 className="text-xl font-display font-bold text-slate-800 uppercase tracking-wider">Regulamento do Minuto Certo</h2>
                </div>
              </div>

              <div className="text-slate-600 text-sm leading-relaxed space-y-4">
                <p className="text-slate-700 font-medium text-base">
                  O <strong>Minuto Certo</strong> é uma modalidade promocional empolgante, onde você compra bilhetes com minutos aleatórios e concorre a um prêmio fixo de <strong className="text-amber-700">R$ 100,00</strong> por jogo oficial (válido exclusivamente para o <strong>1º gol</strong> da partida).
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Funcionamento e Sucessão */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      Regras de Sorteio e Premiação
                    </h3>
                    <ul className="space-y-3.5 text-xs text-slate-600">
                      <li className="flex items-start gap-2.5">
                        <span className="text-amber-500 font-extrabold text-base leading-none">•</span>
                        <span><strong>Valor Fixo:</strong> Apenas <strong className="text-slate-800">R$ 2,00 por bilhete</strong>. Cada bilhete representa um minuto único entre 1 e 100.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-amber-500 font-extrabold text-base leading-none">•</span>
                        <span><strong>Prêmio não dividido:</strong> O prêmio é de <strong className="text-slate-800">R$ 100,00 inteiros</strong> para o detentor do minuto sorteado do <strong>1º gol da partida</strong>. Cada minuto é vendido no máximo uma vez, garantindo exclusividade!</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-amber-500 font-extrabold text-base leading-none">•</span>
                        <span><strong>Regra de Sucessão de Gols:</strong> Caso o primeiro gol saia em um minuto vazio (sem comprador), o prêmio passa automaticamente para o <strong className="text-slate-800">segundo gol da partida</strong>, e assim sucessivamente.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-amber-500 font-extrabold text-base leading-none">•</span>
                        <span><strong>Vencedor por Aproximação:</strong> Se a partida tiver gols mas <strong className="text-slate-800">nenhum dos minutos correspondentes aos gols tiver comprador</strong>, o prêmio de R$ 100,00 será concedido ao jogador cujo minuto adquirido mais se <strong className="text-slate-800">aproximou do minuto do primeiro gol</strong> da partida.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-amber-500 font-extrabold text-base leading-none">•</span>
                        <span><strong>Critério de Desempate:</strong> Caso haja empate exato no critério de aproximação (ex: primeiro gol aos 36&apos;, e haja compradores dos minutos 34 e 38, ambos distantes 2 minutos), o critério de desempate será a <strong className="text-slate-800">pontuação na Classificação Geral do Bolão</strong> após a finalização da partida (o jogador melhor classificado leva o prêmio).</span>
                      </li>
                    </ul>
                  </div>

                  {/* Grid de Minutos */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                      Divisão dos 100 Minutos
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      As janelas de tempo são mapeadas de 1 a 100 para cobrir todo o tempo regulamentar e os acréscimos padrões do esporte:
                    </p>
                    <ul className="space-y-2 text-xs font-mono">
                      <li className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                        <span className="font-bold text-slate-750">Minutos 1 a 45</span>
                        <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">1º Tempo Regular</span>
                      </li>
                      <li className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                        <span className="font-bold text-slate-750">Acréscimos 1ºT</span>
                        <span className="text-indigo-800 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[10px]">45+1&apos; a 45+5&apos;</span>
                      </li>
                      <li className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                        <span className="font-bold text-slate-750">Minutos 46 a 90</span>
                        <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">2º Tempo Regular</span>
                      </li>
                      <li className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                        <span className="font-bold text-slate-750">Acréscimos 2ºT</span>
                        <span className="text-indigo-800 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[10px]">90+1&apos; a 90+5&apos;</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Seção Explicativa da Imagem do Google */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs mt-6">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 text-indigo-600">
                    <Clock className="w-4 h-4" />
                    Referência Oficial: O Minuto do Gol no Google
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Para dirimir qualquer dúvida e garantir total transparência, o minuto oficial adotado para apuração de cada gol será o <strong>minuto exibido no placar oficial de busca do Google</strong> (conforme imagem ilustrativa abaixo). Veja como funciona a apuração prática de cada gol baseado na partida de exemplo:
                  </p>

                  <div className="my-4 flex flex-col items-center justify-center bg-slate-50 p-4 rounded-xl border border-slate-150">
                    <img 
                      src={googleScoreboardImg} 
                      alt="Placar Oficial Google - Exemplo de Minutos dos Gols"
                      className="max-w-full rounded-lg shadow-sm border border-slate-200 object-contain h-auto max-h-[160px]"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[10px] text-slate-400 font-medium mt-2">
                      Exemplo real do Google Search: Noruega 1 x 2 Inglaterra
                    </span>
                  </div>

                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">Estudo de Caso Prático (Apuração Oficial):</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-slate-100">
                        <p className="font-bold text-slate-800 mb-1">1º Gol (Noruega 36&apos;)</p>
                        <p className="text-slate-600 leading-relaxed">
                          Marcado aos <strong className="text-slate-700">36&apos;</strong>. O vencedor imediato é o participante que adquiriu o <strong>Minuto 36</strong>.
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100">
                        <p className="font-bold text-slate-800 mb-1">2º Gol (Inglaterra 45+2&apos;)</p>
                        <p className="text-slate-600 leading-relaxed">
                          Marcado no acréscimo do 1º tempo. O bilhete vencedor é o <strong>45+2</strong> e não o <strong>47</strong> (visto que o bilhete 47 representa o minuto 47 do segundo tempo regular). Os acréscimos do 1º tempo são compostos de forma exclusiva pelos bilhetes de 45+1 a 45+5.
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100">
                        <p className="font-bold text-slate-800 mb-1">3º Gol (Inglaterra 93&apos;)</p>
                        <p className="text-slate-600 leading-relaxed">
                          Marcado no acréscimo do 2º tempo (exibido como 90+3&apos; no placar oficial do Google). O bilhete vencedor é o <strong>90+3</strong> (que faz parte do lote de acréscimos de 90+1 a 90+5) e não o bilhete <strong>93</strong> (que é regular do 2º tempo).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 italic bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                  * <strong>Observações Adicionais:</strong> Se a partida terminar sem nenhum gol (0x0) ou se todos os minutos jogados estiverem totalmente sem comprador (caso extremo), o valor acumulado do prêmio é transferido integralmente para o Minuto Certo do jogo seguinte.
                </p>
              </div>
            </div>
            <div className="border-t border-slate-100 mt-6 pt-4 flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Prêmio: R$ 100,00</span>
              <span className="text-xs font-bold text-amber-700">R$ 2,00 por Bilhete</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Info Warning Card */}
      <motion.div 
        variants={itemVariants}
        className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex items-start gap-4 text-left"
      >
        <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Atenção Especial: Carregamento de Recursos</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            Recomendamos enfaticamente carregar suas recargas com antecedência para evitar contratempos. Caso uma aposta permaneça registrada como <strong>Pendente</strong> pela falta de crédito após o limite de 30 minutos antes do início do jogo, ela não receberá homologação administrativa e será formalmente invalidada.
          </p>
        </div>
      </motion.div>

      {/* Play/Profile prompt */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col sm:flex-row shadow-xs p-5 bg-slate-100 border border-slate-200 rounded-3xl justify-center items-center gap-4 text-center"
      >
        <p className="text-sm font-semibold text-slate-600">Entendeu as regras e quer apostar?</p>
        <div className="flex gap-4">
          <Link to="/" className="text-xs font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-xl shadow-xs transition-all cursor-pointer">
            Ver Próximos Jogos
          </Link>
          <Link to="/panel" className="text-xs font-bold uppercase tracking-wider bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 px-5 py-3 rounded-xl transition-all cursor-pointer">
            Minhas Carteira e Apostas
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
