
import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowUpRight, ArrowDownRight, Trash2, PieChart, Download, FileText, Loader2, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { useData } from '../context/DataContext';
import { generateMonthlyReportPDF } from '../services/pdfService';

// Componente para animação de scroll (Reutilizado para consistência visual)
interface AnimatedItemProps {
  children: React.ReactNode;
  index: number;
  className?: string;
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({ children, index, className = '' }) => {
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
      className={`transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1) transform ${className} ${
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

const Financials: React.FC = () => {
  const { transactions, addTransaction, removeTransaction, categories, showNotification } = useData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTrans, setNewTrans] = useState<Partial<Transaction>>({ type: 'ENTRY', category: '' });
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  
  // Custom Date Picker State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [reportDate, setReportDate] = useState(new Date());

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  const stats = transactions.reduce((acc, curr) => {
    if (curr.type === 'ENTRY') acc.revenue += curr.amount;
    else acc.expenses += curr.amount;
    return acc;
  }, { revenue: 0, expenses: 0 });

  const netProfit = stats.revenue - stats.expenses;
  const realProfit = netProfit * 0.90; 

  const handleAdd = () => {
    if (!newTrans.amount || !newTrans.description) {
      alert("Por favor, preencha a descrição e o valor.");
      return;
    }

    const t: Transaction = {
      id: Date.now().toString(),
      description: newTrans.description,
      amount: Number(newTrans.amount),
      type: newTrans.type as TransactionType,
      category: newTrans.category || 'Geral',
      date: new Date().toISOString().split('T')[0]
    };
    addTransaction(t);
    showNotification('Transação adicionada com sucesso!', 'success');
    setIsModalOpen(false);
    setNewTrans({ type: 'ENTRY', category: '', amount: 0, description: '' });
  };

  const handleDownloadReport = async () => {
    setIsDownloadingPdf(true);

    const currentMonth = reportDate.getMonth();
    const currentYear = reportDate.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    if (monthlyTransactions.length === 0) {
        setIsDownloadingPdf(false);
        showNotification("Não há movimentações neste mês.", 'error');
        return;
    }

    const mStats = monthlyTransactions.reduce((acc, curr) => {
        if (curr.type === 'ENTRY') acc.revenue += curr.amount;
        else acc.expenses += curr.amount;
        return acc;
    }, { revenue: 0, expenses: 0 });

    const mNetProfit = mStats.revenue - mStats.expenses;
    const mRealProfit = mNetProfit * 0.90;

    const monthName = reportDate.toLocaleString('pt-AO', { month: 'long', year: 'numeric' });

    try {
        const pdfFile = await generateMonthlyReportPDF(
            monthName, 
            { ...mStats, netProfit: mNetProfit, realProfit: mRealProfit }, 
            monthlyTransactions
        );
        showNotification('PDF Pronto! Abrindo opções de partilha...', 'success');

        // Trigger Native Sharing
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
                files: [pdfFile],
                title: `Relatório ${monthName}`,
                text: 'Segue o relatório financeiro mensal.'
            });
        }
    } catch (error) {
        console.error("Error generating report", error);
        showNotification("Erro ao gerar relatório", 'error');
    } finally {
        setTimeout(() => setIsDownloadingPdf(false), 2000);
        setIsDatePickerOpen(false);
    }
  };

  const changeMonth = (delta: number) => {
      const newDate = new Date(reportDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setReportDate(newDate);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white/90 backdrop-blur-md p-5 rounded-[2rem] shadow-soft border border-white/50 sticky top-0 z-20">
         <h2 className="text-xl font-black text-brand-text tracking-tight">Financeiro</h2>
         <div className="flex gap-2">
            <button 
              onClick={() => setIsDatePickerOpen(true)}
              className="w-9 h-9 bg-brand-yellow text-[#211D49] rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg"
              title="Baixar Relatório Mensal"
            >
                <Download size={16} strokeWidth={2.5}/>
            </button>
         </div>
      </header>

      {/* Main Stats Card - Glass */}
      <AnimatedItem index={0}>
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-[2.5rem] shadow-soft border border-white/50">
            <div className="text-center mb-6">
                <p className="text-brand-muted text-[10px] font-bold uppercase tracking-widest mb-2">Lucro Líquido</p>
                <h3 className="text-3xl font-black text-brand-text">{formatMoney(netProfit)}</h3>
            </div>
            
            <div className="flex gap-4">
                <div className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-100 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 bg-green-500/20 rounded text-green-500 shrink-0"><ArrowUpRight size={10}/></div>
                        <span className="text-[10px] text-brand-muted font-bold uppercase truncate">Entradas</span>
                    </div>
                    <p className="font-bold text-brand-text text-base truncate">{formatMoney(stats.revenue)}</p>
                </div>
                <div className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-100 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 bg-red-500/20 rounded text-red-500 shrink-0"><ArrowDownRight size={10}/></div>
                        <span className="text-[10px] text-brand-muted font-bold uppercase truncate">Saídas</span>
                    </div>
                    <p className="font-bold text-brand-text text-base truncate">{formatMoney(stats.expenses)}</p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-brand-muted">Lucro Real Estimado (90%)</span>
                <span className="text-brand-yellow font-bold text-base">{formatMoney(realProfit)}</span>
            </div>
        </div>
      </AnimatedItem>

      {/* Action Bar */}
      <AnimatedItem index={1}>
        <div className="flex gap-3">
            <button 
            onClick={() => { setIsModalOpen(true); setNewTrans({type: 'ENTRY', category: ''}); }}
            className="flex-1 bg-brand-yellow text-[#211D49] p-4 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-yellow-400 transition shadow-lg group text-sm"
            >
                <div className="w-5 h-5 rounded-full bg-[#211D49]/10 flex items-center justify-center text-[#211D49] group-hover:scale-110 transition shrink-0">
                    <ArrowUpRight size={12} />
                </div>
                Receita
            </button>
            <button 
            onClick={() => { setIsModalOpen(true); setNewTrans({type: 'EXIT', category: ''}); }}
            className="flex-1 bg-white/80 backdrop-blur-md border border-white/60 text-brand-text p-4 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-white transition shadow-sm group text-sm"
            >
                <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition shrink-0">
                    <ArrowDownRight size={12} />
                </div>
                Despesa
            </button>
        </div>
      </AnimatedItem>

      {/* Transactions List */}
      <div>
        <h3 className="font-bold text-brand-text text-base mb-4 px-2">Movimentações</h3>
        <div className="space-y-3 min-h-[200px]">
            {transactions.length === 0 && (
                <div className="text-center py-10 opacity-50">
                    <p className="text-sm font-bold text-brand-muted">Sem movimentações recentes.</p>
                </div>
            )}
          {transactions.map((t, index) => (
            <AnimatedItem key={t.id} index={index + 2}>
                <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-sm hover:bg-white transition-all flex items-center justify-between group border border-white/50">
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                        <div className={`w-10 h-10 min-w-[2.5rem] rounded-xl flex items-center justify-center transition-colors ${t.type === 'ENTRY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} shrink-0`}>
                            {t.type === 'ENTRY' ? <ArrowUpRight size={18} strokeWidth={2.5} /> : <ArrowDownRight size={18} strokeWidth={2.5} />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-brand-text text-sm mb-0.5 truncate">{t.description}</p>
                            <p className="text-[10px] text-brand-muted font-medium uppercase tracking-wide truncate">{t.category} • {new Date(t.date).toLocaleDateString('pt-AO')}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 pl-2 shrink-0">
                        <p className={`font-black text-sm ${t.type === 'ENTRY' ? 'text-green-500' : 'text-red-500'} whitespace-nowrap`}>
                            {t.type === 'ENTRY' ? '+' : '-'} {formatMoney(t.amount)}
                        </p>
                        <button onClick={() => removeTransaction(t.id)} className="opacity-0 group-hover:opacity-100 text-brand-muted hover:text-red-500 transition-opacity">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </AnimatedItem>
          ))}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 animate-slide-up shadow-2xl flex flex-col max-h-[90vh] border border-white/50">
              <div className="flex-1 overflow-y-auto">
                  <h3 className="text-xl font-black mb-6 text-brand-text text-center tracking-tight">
                      {newTrans.type === 'ENTRY' ? 'Nova Receita' : 'Nova Despesa'}
                  </h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-bold text-brand-muted uppercase ml-1 block mb-1">Descrição</label>
                          <input 
                            placeholder="Ex: Serviço Sofá"
                            className="w-full bg-gray-50 p-3.5 rounded-xl border-0 text-brand-text font-semibold focus:ring-2 focus:ring-brand-yellow outline-none text-sm"
                            value={newTrans.description || ''}
                            onChange={e => setNewTrans({...newTrans, description: e.target.value})}
                          />
                      </div>
                      
                      <div>
                          <label className="text-[10px] font-bold text-brand-muted uppercase ml-1 block mb-1">Valor (Kz)</label>
                          <input 
                            type="number"
                            placeholder="0,00"
                            className="w-full bg-gray-50 p-3.5 rounded-xl border-0 text-brand-text font-black text-lg focus:ring-2 focus:ring-brand-yellow outline-none"
                            value={newTrans.amount || ''}
                            onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})}
                          />
                      </div>

                      <div>
                          <label className="text-[10px] font-bold text-brand-muted uppercase ml-1 block mb-1">Categoria</label>
                          <input
                            list="categories-list"
                            placeholder="Selecione ou digite..."
                            className="w-full bg-gray-50 p-3.5 rounded-xl border-0 text-brand-text font-medium focus:ring-2 focus:ring-brand-yellow outline-none text-sm"
                            value={newTrans.category}
                            onChange={e => setNewTrans({...newTrans, category: e.target.value})}
                          />
                          <datalist id="categories-list">
                              {categories.map(c => <option key={c} value={c} />)}
                          </datalist>
                      </div>
                  </div>
              </div>

              <div className="flex gap-3 mt-8">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 text-brand-muted font-bold hover:bg-gray-50 rounded-xl transition text-sm">Cancelar</button>
                 <button onClick={handleAdd} className={`flex-1 py-3.5 text-[#211D49] rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-105 transition text-sm ${newTrans.type === 'ENTRY' ? 'bg-brand-yellow' : 'bg-red-500 text-white'}`}>
                    <Plus size={18} /> Salvar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Custom Date Picker Modal for Reports */}
      {isDatePickerOpen && (
          <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 animate-slide-up shadow-2xl border border-white/50">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-brand-text">Selecionar Mês</h3>
                      <button onClick={() => setIsDatePickerOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-100 text-brand-text transition"><X size={16}/></button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between mb-8">
                      <button onClick={() => changeMonth(-1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:scale-105 transition">
                          <ChevronLeft size={20}/>
                      </button>
                      <div className="text-center">
                          <p className="font-black text-xl text-brand-text uppercase tracking-tight">
                              {reportDate.toLocaleString('pt-AO', { month: 'long' })}
                          </p>
                          <p className="text-xs font-bold text-brand-muted">{reportDate.getFullYear()}</p>
                      </div>
                      <button onClick={() => changeMonth(1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:scale-105 transition">
                          <ChevronRight size={20}/>
                      </button>
                  </div>

                  <button 
                    onClick={handleDownloadReport}
                    className="w-full py-4 bg-brand-yellow text-[#211D49] rounded-2xl font-bold shadow-lg hover:scale-[1.02] transition flex items-center justify-center gap-2"
                  >
                      <Download size={20} strokeWidth={2.5}/>
                      Baixar Relatório
                  </button>
              </div>
          </div>
      )}

      {/* Elegant PDF Downloading Modal */}
      {isDownloadingPdf && (
          <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
             <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xs shadow-2xl flex flex-col items-center animate-slide-up relative overflow-hidden">
                <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-brand-yellow to-brand-gold"></div>
                
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6 relative">
                    <Loader2 size={32} className="text-brand-yellow animate-spin absolute" strokeWidth={2.5}/>
                    <FileText size={16} className="text-brand-text" strokeWidth={3}/>
                </div>
                
                <h3 className="text-xl font-black text-brand-text text-center leading-tight mb-2">Gerando Relatório</h3>
                <p className="text-brand-muted text-xs font-medium text-center mb-6">Compilando dados...</p>
                
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-yellow animate-[shimmer_1.5s_infinite_linear] w-[60%] rounded-full"></div>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default Financials;
