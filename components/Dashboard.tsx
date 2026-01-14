
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell, CartesianGrid, YAxis, Legend } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, MoreHorizontal, Bot, MessageCircle, Send, X, ExternalLink, Loader2, Sparkles, FileText, Calendar, ThumbsUp, Wallet, Download, Truck, CheckCircle, Clock } from 'lucide-react';
import { askAIExpert } from '../services/geminiService';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

interface ChatMessage {
    role: 'user' | 'bot';
    text: string;
}

// Componente para animação de scroll
interface AnimatedItemProps {
  children: React.ReactNode;
  index: number;
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({ children, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (elementRef.current) observer.unobserve(elementRef.current);
        }
      },
      { threshold: 0.1, rootMargin: '30px' }
    );

    if (elementRef.current) observer.observe(elementRef.current);
    return () => { if (elementRef.current) observer.unobserve(elementRef.current); };
  }, []);

  return (
    <div 
      ref={elementRef}
      className={`transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1) transform ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100 blur-0' 
          : 'opacity-0 translate-y-12 scale-[0.96] blur-sm'
      }`}
      style={{ transitionDelay: `${(index % 10) * 50}ms` }}
    >
      {children}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const formatMoney = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);
  const { theme } = useTheme();
  const { transactions } = useData(); 
  
  // Connectivity State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // PERFORMANCE FIX: Defer chart rendering to allow UI to paint first
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Slight delay to prioritize Main Thread for animations
    const t = setTimeout(() => setIsChartReady(true), 100);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(t);
    };
  }, []);

  // --- CHART LOGIC: OPTIMIZED Real Data Processing ---
  // Using a Map reduce complexity from O(7*N) to O(N)
  const weeklyData = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday...
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    monday.setHours(12, 0, 0, 0);

    // 1. Create a fast lookup map for incomes and expenses
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};

    transactions.forEach(t => {
        // Simple date check (assuming t.date is YYYY-MM-DD)
        if (t.type === 'ENTRY') {
            incomeMap[t.date] = (incomeMap[t.date] || 0) + t.amount;
        } else {
            expenseMap[t.date] = (expenseMap[t.date] || 0) + t.amount;
        }
    });

    const daysMap = [
        { short: 'Seg', full: 'Segunda-feira' },
        { short: 'Ter', full: 'Terça-feira' },
        { short: 'Qua', full: 'Quarta-feira' },
        { short: 'Qui', full: 'Quinta-feira' },
        { short: 'Sex', full: 'Sexta-feira' },
        { short: 'Sáb', full: 'Sábado' },
        { short: 'Dom', full: 'Domingo' }
    ];

    // 2. Build array using lookup (Fast)
    const data = daysMap.map((dayInfo, index) => {
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + index);
        const dateStr = targetDate.toISOString().split('T')[0];

        return {
            name: dayInfo.short,
            fullDay: dayInfo.full,
            income: incomeMap[dateStr] || 0,
            expense: expenseMap[dateStr] || 0,
            date: dateStr,
            isToday: dateStr === new Date().toISOString().split('T')[0]
        };
    });

    return data;
  }, [transactions]);

  const totalRevenue = transactions
    .filter(t => t.type === 'ENTRY')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalExpenses = transactions
    .filter(t => t.type === 'EXIT')
    .reduce((acc, t) => acc + t.amount, 0);

  const saldo = totalRevenue - totalExpenses;

  // --- UI COMPONENTS ---

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-xl shadow-xl border border-white/50 animate-in fade-in zoom-in-95 duration-200 z-50 min-w-[160px]">
          <div className="mb-3 border-b border-gray-100 pb-2">
             <p className="text-brand-muted text-[10px] font-bold uppercase tracking-wide">{dayData.fullDay}</p>
          </div>
          
          <div className="space-y-2">
              <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-brand-yellow shadow-[0_0_8px_#F3A421]"></div>
                      <span className="text-xs font-bold text-gray-600">Entrada</span>
                  </div>
                  <span className="text-xs font-black text-brand-text">{formatMoney(dayData.income)}</span>
              </div>
              
              <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <span className="text-xs font-bold text-gray-600">Saída</span>
                  </div>
                  <span className="text-xs font-black text-red-500">{formatMoney(dayData.expense)}</span>
              </div>
          </div>

          {(dayData.income - dayData.expense) !== 0 && (
             <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
                 <span className="text-[10px] font-bold text-brand-muted">Saldo do Dia</span>
                 <span className={`text-xs font-black ${dayData.income - dayData.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                     {formatMoney(dayData.income - dayData.expense)}
                 </span>
             </div>
          )}
        </div>
      );
    }
    return null;
  };

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('');

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    if ((window as any).deferredPrompt) {
        setInstallPrompt((window as any).deferredPrompt);
    }
    const handleInstallable = () => {
        setInstallPrompt((window as any).deferredPrompt);
    };
    window.addEventListener('installable', handleInstallable);
    return () => window.removeEventListener('installable', handleInstallable);
  }, []);

  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isAiLoading]);

  const handleInstallApp = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
      }
      setInstallPrompt(null);
      (window as any).deferredPrompt = null;
  };

  const handleAskAI = async () => {
      if (!isOnline) {
          setChatHistory(prev => [...prev, { role: 'user', text: aiQuestion }]);
          setChatHistory(prev => [...prev, { role: 'bot', text: 'Estou offline. Conecte-se à internet para usar a IA.' }]);
          setAiQuestion('');
          return;
      }
      if (!aiQuestion.trim()) return;
      const userText = aiQuestion;
      setAiQuestion('');
      setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
      setIsAiLoading(true);
      const response = await askAIExpert(userText);
      setChatHistory(prev => [...prev, { role: 'bot', text: response }]);
      setIsAiLoading(false);
  };

  const openWhatsAppLink = () => {
      const cleanPhone = waPhone.replace(/[^0-9]/g, '');
      if (!cleanPhone) return alert("Digite um número válido");
      const finalPhone = cleanPhone.length <= 9 ? `244${cleanPhone}` : cleanPhone;
      
      const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(waMessage)}`;
      window.open(url, '_blank');
  };

  const templates = [
      { id: 'quote', icon: FileText, label: 'Orçamento', text: "Olá! Segue o orçamento oficial da Mais Palma. O valor inclui higienização profunda e deslocação. Podemos agendar?" },
      { id: 'schedule', icon: Calendar, label: 'Agendar', text: "Olá! Gostaria de confirmar a data para a realização do serviço. Qual dia da semana prefere?" },
      { id: 'onmyway', icon: Truck, label: 'A Caminho', text: "Olá! A equipa da Mais Palma já está a caminho do seu endereço. Previsão de chegada em 30 minutos." },
      { id: 'done', icon: CheckCircle, label: 'Conclusão', text: "Serviço finalizado com sucesso! ✨ Obrigado por escolher a Mais Palma. Segue a fatura em anexo." },
      { 
        id: 'payment', 
        icon: Wallet, 
        label: 'Cobrança', 
        text: "Olá! Seguem os dados para pagamento:\n\n🏦 IBAN (BAI): AO06 0006 0000 1720 2092 301 42\n📱 MCX Express: 923 591 743\n\nTitular: Mais Palma Lda.\nPor favor, envie o comprovativo." 
      },
      { id: 'feedback', icon: ThumbsUp, label: 'Pós-Venda', text: "Olá! Tudo bem? Passando para saber o que achou do resultado da higienização. O seu feedback é muito importante!" },
  ];

  return (
    <div className="space-y-6 pb-32">
      {/* Brand Header - Glass Effect */}
      <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] shadow-card border border-white/40 sticky top-0 z-30 transition-all duration-300">
        <div className="flex items-center gap-4">
             {/* Logo Background Changed to White */}
             <div className="w-12 h-12 rounded-2xl shadow-md transition-all overflow-hidden border border-gray-100 bg-white group relative flex items-center justify-center">
                <img 
                  src="https://i.postimg.cc/6q6K9xSV/Imagotipo_V_2.png" 
                  alt="Mais Palma Logo" 
                  className="w-full h-full object-contain p-1"
                />
             </div>
             <div>
                <h1 className="text-xl font-black text-brand-text leading-tight tracking-tight">MAIS PALMA</h1>
                <div className="flex items-center gap-1.5">
                    {/* DYNAMIC CONNECTIVITY INDICATOR */}
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isOnline ? 'text-brand-muted' : 'text-red-500'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                    </p>
                </div>
             </div>
        </div>
        
        <div className="flex items-center gap-2">
            {installPrompt && (
                <button 
                    onClick={handleInstallApp}
                    className="flex items-center gap-2 bg-brand-yellow text-[#211D49] px-4 py-2 rounded-full font-bold text-xs shadow-glow animate-pulse-slow"
                >
                    <Download size={14} strokeWidth={3} />
                    Instalar
                </button>
            )}
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/50 transition text-brand-text">
                <MoreHorizontal size={22} />
            </button>
        </div>
      </div>

      {/* Hero Stats - High Glass Transparency */}
      <AnimatedItem index={0}>
        <div className="relative overflow-hidden rounded-[2.5rem] shadow-soft group border border-white/50 bg-white/90 backdrop-blur-xl">
            {/* Animated Background Mesh */}
            <div className="absolute top-[-50%] right-[-20%] w-[300px] h-[300px] rounded-full bg-yellow-400/10 blur-[80px] group-hover:bg-yellow-400/20 transition-all duration-1000"></div>
            <div className="absolute bottom-[-20%] left-[-20%] w-[200px] h-[200px] rounded-full bg-blue-500/5 blur-[60px]"></div>

            <div className="relative z-10 p-8">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-yellow-100 rounded-lg">
                            <Wallet size={14} className="text-yellow-600"/>
                        </div>
                        <p className="text-brand-muted text-xs font-bold uppercase tracking-widest">Saldo Atual</p>
                    </div>
                </div>
                
                <h2 className="text-5xl font-black text-brand-text mb-8 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-brand-text to-brand-muted">
                    {formatMoney(saldo)}
                </h2>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50/80 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm hover:bg-white transition">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/10">
                                <ArrowUpRight size={12} className="text-green-500"/>
                            </div>
                            <p className="text-[10px] font-bold text-brand-muted uppercase">Entradas</p>
                        </div>
                        <p className="font-bold text-lg text-brand-text tracking-tight">{formatMoney(totalRevenue)}</p>
                    </div>
                    <div className="bg-gray-50/80 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm hover:bg-white transition">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/10">
                                <ArrowDownRight size={12} className="text-red-500"/>
                            </div>
                            <p className="text-[10px] font-bold text-brand-muted uppercase">Saídas</p>
                        </div>
                        <p className="font-bold text-lg text-brand-text tracking-tight">{formatMoney(totalExpenses)}</p>
                    </div>
                </div>
            </div>
        </div>
      </AnimatedItem>

      {/* New Tools Section - Glass Cards */}
      <AnimatedItem index={1}>
        <div className="grid grid-cols-2 gap-4">
            <button 
            onClick={() => { setIsAIModalOpen(true); }}
            className="bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] shadow-card flex flex-col items-center gap-3 transition-all active:scale-95 border border-white/50 hover:border-yellow-400/50 group relative overflow-hidden"
            >
            <div className="absolute inset-0 bg-yellow-400/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <div className="w-14 h-14 bg-gray-50 text-brand-text group-hover:bg-brand-yellow group-hover:text-[#211D49] transition-colors rounded-2xl flex items-center justify-center shadow-lg relative z-10">
                <Bot size={26} strokeWidth={1.5}/>
                <div className="absolute top-0 right-0 w-3 h-3 bg-brand-yellow rounded-full animate-ping group-hover:hidden"></div>
            </div>
            <span className="font-bold text-sm text-brand-text relative z-10">AI Expert</span>
            </button>
            
            <button 
            onClick={() => setIsLinkModalOpen(true)}
            className="bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] shadow-card flex flex-col items-center gap-3 transition-all active:scale-95 border border-white/50 hover:border-green-500/50 group relative overflow-hidden"
            >
            <div className="absolute inset-0 bg-green-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <div className="w-14 h-14 bg-gray-50 text-brand-text group-hover:bg-[#25D366] group-hover:text-white transition-colors rounded-2xl flex items-center justify-center shadow-lg relative z-10">
                <MessageCircle size={26} strokeWidth={1.5}/>
            </div>
            <span className="font-bold text-sm text-brand-text relative z-10">Msg Rápida</span>
            </button>
        </div>
      </AnimatedItem>

      {/* Functional Chart - Glass Effect */}
      <AnimatedItem index={2}>
        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] shadow-card border border-white/50">
            <div className="flex justify-between items-center mb-8">
            <div>
                <h3 className="font-bold text-brand-text text-lg tracking-tight">Fluxo Semanal</h3>
                <div className="flex items-center gap-2 mt-1">
                    <Calendar size={10} className="text-brand-muted" />
                    <p className="text-[10px] text-brand-muted font-medium">Análise Comparativa</p>
                </div>
            </div>
            {/* Simple Legend */}
            <div className="flex gap-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-brand-yellow"></div>
                    <span className="text-[10px] font-bold text-brand-muted uppercase">Entrada</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <span className="text-[10px] font-bold text-brand-muted uppercase">Saída</span>
                </div>
            </div>
            </div>
            <div className="h-64">
                {isChartReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barGap={2}>
                      <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F3A421" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#D98E15" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F87171" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#EF4444" stopOpacity={1}/>
                          </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <Tooltip 
                          content={<CustomTooltip />}
                          cursor={{fill: 'rgba(0,0,0,0.03)'}}
                      />
                      <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 10, fill: '#71717A', fontWeight: '600'}} 
                          dy={15}
                          interval={0}
                          padding={{ left: 10, right: 10 }}
                      />
                      <YAxis 
                           axisLine={false}
                           tickLine={false}
                           tick={{fontSize: 9, fill: '#9CA3AF'}}
                           tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Bar dataKey="income" fill="url(#colorIncome)" radius={[4,4,4,4]} barSize={12} animationDuration={1500} />
                      <Bar dataKey="expense" fill="url(#colorExpense)" radius={[4,4,4,4]} barSize={12} animationDuration={1500} />
                  </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center opacity-50">
                     <Loader2 size={24} className="text-brand-yellow animate-spin mb-2"/>
                     <span className="text-[10px] font-bold text-brand-muted">Carregando dados...</span>
                  </div>
                )}
            </div>
        </div>
      </AnimatedItem>

      {/* AI Consultant Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 animate-slide-up shadow-2xl flex flex-col h-[80vh] border border-white/50">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-premium text-[#211D49] rounded-2xl flex items-center justify-center shadow-glow">
                          <Bot size={24} />
                      </div>
                      <div>
                          <h3 className="font-bold text-brand-text text-base">Assistente Mais Palma</h3>
                          <p className="text-[10px] text-brand-muted uppercase font-bold tracking-wide">Mais Palma AI</p>
                      </div>
                  </div>
                  <button onClick={() => setIsAIModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-100 text-brand-text transition"><X size={18}/></button>
              </div>

              {/* Chat History Area */}
              <div className="flex-1 overflow-y-auto bg-gray-50/50 rounded-3xl p-4 mb-4 space-y-4 border border-gray-100">
                  {chatHistory.length === 0 && (
                      <div className="text-center pt-20 text-brand-muted flex flex-col items-center opacity-50">
                          <Bot size={48} className="mb-4 text-brand-yellow" strokeWidth={1} />
                          <p className="text-sm font-medium">Como posso ajudar na gestão hoje?</p>
                          {!isOnline && <p className="text-xs text-red-500 mt-2 font-bold">Modo Offline - IA Indisponível</p>}
                      </div>
                  )}

                  {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                              msg.role === 'user' 
                              ? 'bg-brand-yellow text-[#211D49] rounded-tr-sm' 
                              : 'bg-white text-brand-text border border-gray-100 rounded-tl-sm'
                          }`}>
                              {msg.text}
                          </div>
                      </div>
                  ))}
                  
                  {isAiLoading && (
                      <div className="flex justify-start">
                          <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 flex items-center gap-3 text-xs text-brand-muted">
                              <Loader2 size={14} className="animate-spin text-brand-yellow" /> 
                              <span className="animate-pulse">Gerando resposta...</span>
                          </div>
                      </div>
                  )}
                  <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="relative">
                  <input 
                    className="w-full bg-gray-50 p-4 pr-14 rounded-2xl border border-gray-100 text-brand-text text-sm font-medium focus:ring-2 focus:ring-brand-yellow/50 outline-none shadow-inner transition-all disabled:opacity-50"
                    placeholder={isOnline ? "Faça uma pergunta..." : "Offline"}
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                    disabled={!isOnline}
                  />
                  <button 
                    onClick={handleAskAI}
                    disabled={!aiQuestion.trim() || isAiLoading || !isOnline}
                    className="absolute right-2 top-2 w-10 h-10 bg-brand-yellow text-[#211D49] rounded-xl flex items-center justify-center disabled:opacity-50 hover:scale-105 transition shadow-lg"
                  >
                      <Send size={18} />
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* WhatsApp Quick Message Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 animate-slide-up shadow-2xl flex flex-col max-h-[90vh] border border-white/50">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h3 className="text-xl font-black text-brand-text tracking-tight">WhatsApp Direct</h3>
                      <p className="text-xs text-brand-muted mt-1">Envie mensagens sem salvar o contato</p>
                  </div>
                  <button onClick={() => setIsLinkModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-100 text-brand-text transition"><X size={18}/></button>
              </div>
              
              <div className="space-y-5 mb-8 overflow-y-auto max-h-[60vh] scrollbar-hide">
                  <div className="space-y-2">
                      <label className="text-[10px] font-bold text-brand-muted uppercase ml-2">Destinatário</label>
                      <div className="relative">
                        <div className="absolute left-4 top-4 text-brand-muted"><FileText size={18}/></div>
                        <input 
                            className="w-full bg-gray-50 p-4 pl-12 rounded-2xl border border-transparent focus:border-green-500/50 text-brand-text font-bold focus:ring-2 focus:ring-green-500/20 outline-none text-base transition-all"
                            placeholder="923 xxx xxx"
                            value={waPhone}
                            onChange={(e) => setWaPhone(e.target.value)}
                        />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-bold text-brand-muted uppercase ml-2">Mensagem (Opcional)</label>
                      <textarea 
                        className="w-full bg-gray-50 p-4 rounded-2xl border border-transparent focus:border-green-500/50 text-brand-text font-medium focus:ring-2 focus:ring-green-500/20 outline-none text-sm resize-none h-32 transition-all"
                        placeholder="Olá! Gostaria de falar sobre..."
                        value={waMessage}
                        onChange={(e) => setWaMessage(e.target.value)}
                      />
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-brand-muted uppercase ml-2">Modelos Rápidos</label>
                     <div className="grid grid-cols-2 gap-2">
                        {templates.map(t => (
                            <button 
                                key={t.id} 
                                onClick={() => setWaMessage(t.text)} 
                                className="p-3 bg-gray-50 rounded-xl flex items-center gap-2 hover:bg-gray-100 border border-gray-100 transition active:scale-95 group text-left"
                            >
                                <div className="p-1.5 bg-white rounded-lg text-brand-muted group-hover:text-brand-yellow transition-colors shadow-sm">
                                    <t.icon size={14} />
                                </div>
                                <span className="text-[10px] font-bold text-brand-muted group-hover:text-brand-text">{t.label}</span>
                            </button>
                        ))}
                     </div>
                  </div>
              </div>

              <button 
                onClick={openWhatsAppLink} 
                className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold shadow-lg hover:shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink size={20} /> Iniciar Conversa
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
