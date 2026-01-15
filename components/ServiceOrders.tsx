
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Clock, Plus, MapPin, Phone, Calendar, Check, FileText, ArrowRight, MessageCircle, Loader2, Pencil, Trash2, X, ChevronLeft, ChevronRight, Layers, Tag, PlusCircle, Search } from 'lucide-react';
import { ServiceOrder, OrderStatus, ItemCategory, PriceTableItem } from '../types';
import { generateInvoicePDF } from '../services/pdfService';
import { useData } from '../context/DataContext';

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

const ServiceOrders: React.FC = () => {
  const { orders, services, addOrder, updateOrder, removeOrder, updateOrderStatus, pdfSettings, showNotification, generateDocId } = useData();
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<ServiceOrder>>({ status: 'PENDING' });
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  
  // Custom Date Picker State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerTime, setPickerTime] = useState('09:00');

  // Service Selector State
  const [isServiceSelectorOpen, setIsServiceSelectorOpen] = useState(false);
  const [activeCategorySelector, setActiveCategorySelector] = useState<string>(ItemCategory.SOFA);

  // Filtrar categorias
  const serviceCategories = useMemo(() => {
      const activeCats = new Set(services.map(s => s.category));
      Object.values(ItemCategory).forEach(c => activeCats.add(c));
      return Array.from(activeCats);
  }, [services]);

  // Filtrar serviços
  const filteredServices = services.filter(item => item.category === activeCategorySelector);

  const handleSaveOrder = () => {
    if (!newOrder.clientName || !newOrder.price || !newOrder.serviceDetails) return alert('Preencha os campos obrigatórios');
    
    if (newOrder.id) {
        // Edit Mode
        const updatedOrder = { ...newOrder } as ServiceOrder;
        updateOrder(updatedOrder);
        showNotification(`Ordem #${newOrder.id} atualizada!`, 'success');
    } else {
        // Create Mode
        const order: ServiceOrder = {
            id: Math.floor(1000 + Math.random() * 9000).toString(),
            clientName: newOrder.clientName,
            serviceDetails: newOrder.serviceDetails,
            price: Number(newOrder.price),
            status: newOrder.status || 'PENDING',
            date: newOrder.date || new Date().toLocaleDateString('pt-AO'),
            address: newOrder.address || 'Não informado',
            phone: newOrder.phone || '-'
        };
        addOrder(order);
        showNotification(`Nova ordem #${order.id} criada!`, 'success');
    }

    setIsModalOpen(false);
    setNewOrder({ status: 'PENDING' });
  };

  const handleEditOrder = (order: ServiceOrder) => {
      setNewOrder({ ...order });
      setIsModalOpen(true);
  };

  const handleDeleteOrder = (id: string) => {
      if (window.confirm("Tem certeza que deseja eliminar esta ordem? Esta ação não pode ser desfeita.")) {
          removeOrder(id);
      }
  };

  const handleCompleteOrder = (id: string) => {
    updateOrderStatus(id, 'COMPLETED');
  };

  const handleConfirmOrder = (id: string) => {
    updateOrderStatus(id, 'IN_PROGRESS');
  };

  const handleGenerateInvoice = async (order: ServiceOrder) => {
    setIsDownloadingPdf(true);
    try {
        const items = [{
          description: order.serviceDetails,
          quantity: 1,
          unitPrice: order.price,
          total: order.price
        }];
        
        // Generate new sequential Invoice ID
        const docId = generateDocId('INVOICE');
        
        const pdfFile = await generateInvoicePDF(order.clientName, order.phone, order.address, items, docId, order.quoteRef, pdfSettings);
        showNotification('PDF Pronto! Abrindo opções de partilha...', 'success');

        // Trigger Native Sharing
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
                files: [pdfFile],
                title: `Fatura ${docId}`,
                text: `Olá ${order.clientName}, segue a fatura do serviço.`
            });
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
             console.log('Compartilhamento cancelado pelo usuário');
             return;
        }
        console.error("Error generating Invoice", error);
        showNotification('Erro ao gerar fatura', 'error');
    } finally {
        setTimeout(() => setIsDownloadingPdf(false), 500);
    }
  };

  const openWhatsApp = (order: ServiceOrder) => {
      const phone = order.phone;
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (!cleanPhone) return alert('Número de telefone inválido');
      
      const finalPhone = cleanPhone.length <= 9 ? `244${cleanPhone}` : cleanPhone;
      
      const firstName = order.clientName.split(' ')[0];
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
      
      const message = `${greeting} ${firstName}! Aqui é da *Mais Palma*. 🌿\n\nEstamos a entrar em contacto referente ao serviço: *${order.serviceDetails}* (#${order.id}).`;

      // ALTERADO: Usar api.whatsapp.com
      window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const getStatusStyle = (s: OrderStatus) => {
    switch (s) {
      case 'PENDING': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'COMPLETED': return 'bg-green-500/10 text-green-600 dark:text-green-500';
      case 'CANCELED': return 'bg-red-500/10 text-red-600 dark:text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusLabel = (s: OrderStatus) => {
    switch (s) {
      case 'PENDING': return 'Pendente';
      case 'IN_PROGRESS': return 'Em Andamento';
      case 'COMPLETED': return 'Concluído';
      case 'CANCELED': return 'Cancelado';
    }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  const filteredOrders = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  // --- Calendar Helpers ---
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 Sunday
  
  const generateCalendarDays = () => {
      const daysInMonth = getDaysInMonth(pickerDate);
      const firstDay = getFirstDayOfMonth(pickerDate);
      const days = [];
      
      // Empty slots for previous month
      for (let i = 0; i < firstDay; i++) {
          days.push(null);
      }
      // Days
      for (let i = 1; i <= daysInMonth; i++) {
          days.push(i);
      }
      return days;
  };

  const handleDateConfirm = () => {
      const formattedDate = `${pickerDate.toLocaleDateString('pt-AO')} às ${pickerTime}`;
      setNewOrder({ ...newOrder, date: formattedDate });
      setIsDatePickerOpen(false);
  };

  const changePickerMonth = (delta: number) => {
      const d = new Date(pickerDate);
      d.setMonth(d.getMonth() + delta);
      setPickerDate(d);
  };

  // Add Service to current order form
  const handleAddServiceToOrder = (item: PriceTableItem) => {
      setNewOrder(prev => {
          const currentDetails = prev.serviceDetails || '';
          const separator = currentDetails.length > 0 ? ', ' : '';
          const newDetails = `${currentDetails}${separator}${item.label}`;
          const currentPrice = prev.price || 0;
          return {
              ...prev,
              serviceDetails: newDetails,
              price: currentPrice + item.price
          };
      });
      setIsServiceSelectorOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center mb-6 bg-white/90 backdrop-blur-md p-5 rounded-[2rem] shadow-soft border border-white/50 sticky top-0 z-20">
        <h2 className="text-xl font-black text-brand-text tracking-tight">Ordens</h2>
        <button 
          onClick={() => { setNewOrder({ status: 'PENDING' }); setIsModalOpen(true); }}
          className="w-10 h-10 bg-brand-yellow text-[#211D49] rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition"
        >
           <Plus size={20} />
        </button>
      </header>

      {/* Tabs - Glass Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-5 py-2.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${filter === f ? 'bg-brand-yellow text-[#211D49] shadow-lg' : 'bg-white/80 backdrop-blur-md border border-white/60 text-brand-muted hover:bg-white'}`}
          >
            {f === 'ALL' ? 'Todas' : getStatusLabel(f as OrderStatus)}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-5 min-h-[300px]">
         {filteredOrders.length === 0 && (
           <div className="text-center py-20 opacity-50">
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-muted">
                   <Clock size={32} />
               </div>
               <p className="text-brand-muted font-bold text-sm">Nenhuma ordem encontrada.</p>
           </div>
         )}
         
         {filteredOrders.map((order, index) => (
           <AnimatedItem key={order.id} index={index}>
               <div className="bg-white/90 backdrop-blur-md rounded-[2rem] p-6 shadow-soft hover:bg-white transition-all border border-transparent hover:border-yellow-200 group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-2xl bg-brand-yellow text-[#211D49] flex items-center justify-center font-black text-xs shadow-md shrink-0">
                            {order.clientName.substring(0,2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-brand-text text-base leading-tight truncate">{order.clientName}</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-brand-muted font-medium">ID #{order.id}</p>
                                {order.quoteRef && <span className="text-[8px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold">Ref: {order.quoteRef}</span>}
                            </div>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-2 shrink-0 ml-2">
                         <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                            {getStatusLabel(order.status)}
                         </span>
                     </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 mb-5 border border-gray-100">
                     <p className="text-sm text-brand-muted font-semibold break-words">{order.serviceDetails}</p>
                  </div>

                  <div className="space-y-2 mb-6">
                     <div className="flex items-center gap-3 text-[10px] text-brand-muted font-medium">
                        <Calendar size={14} className="text-brand-gold shrink-0"/> {order.date}
                     </div>
                     <div className="flex items-center gap-3 text-[10px] text-brand-muted font-medium">
                        <MapPin size={14} className="text-brand-gold shrink-0"/> <span className="truncate">{order.address}</span>
                     </div>
                     <div className="flex items-center gap-3 text-[10px] text-brand-muted font-medium">
                        <Phone size={14} className="text-brand-gold shrink-0"/> {order.phone}
                     </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-5 border-t border-gray-100">
                     <div className="flex justify-between items-center">
                        <span className="font-black text-brand-text text-xl tracking-tight">{formatMoney(order.price)}</span>
                        
                        <div className="flex gap-2">
                             {/* Edit & Delete Buttons */}
                            <button 
                                onClick={() => handleEditOrder(order)}
                                className="w-9 h-9 rounded-xl bg-gray-50 text-brand-muted flex items-center justify-center hover:bg-brand-yellow hover:text-[#211D49] transition"
                                title="Editar Ordem"
                            >
                                <Pencil size={14}/>
                            </button>
                            <button 
                                onClick={() => handleDeleteOrder(order.id)}
                                className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition"
                                title="Eliminar Ordem"
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>
                     </div>

                     <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        
                        {/* WhatsApp Button */}
                        <button 
                           onClick={() => openWhatsApp(order)}
                           className="px-3 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center gap-2 hover:scale-105 transition shadow-sm flex-1 min-w-[50px]"
                           title="Conversar no WhatsApp"
                        >
                           <MessageCircle size={16} fill="currentColor" />
                        </button>

                        <button 
                           onClick={() => handleGenerateInvoice(order)}
                           className="px-3 h-10 rounded-xl bg-gray-50 text-brand-muted flex items-center justify-center gap-2 hover:bg-black/5 transition flex-1 min-w-[50px]"
                           title="Gerar Fatura PDF"
                        >
                           <FileText size={16}/>
                        </button>
                        
                        {order.status === 'PENDING' && (
                          <button 
                            onClick={() => handleConfirmOrder(order.id)}
                            className="px-3 h-10 rounded-xl bg-brand-yellow text-[#211D49] text-[10px] font-bold flex items-center gap-2 hover:bg-brand-gold transition shadow-lg flex-1 whitespace-nowrap"
                          >
                            Confirmar <ArrowRight size={12}/>
                          </button>
                        )}

                        {order.status === 'IN_PROGRESS' && (
                          <button 
                            onClick={() => handleCompleteOrder(order.id)}
                            className="px-3 h-10 rounded-xl bg-green-500 text-white text-[10px] font-bold flex items-center gap-2 hover:bg-green-600 transition shadow-lg flex-1 whitespace-nowrap"
                          >
                            Concluir <Check size={12}/>
                          </button>
                        )}
                     </div>
                  </div>
               </div>
           </AnimatedItem>
         ))}
      </div>

      {/* Add/Edit Order Modal - Glass */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 animate-slide-up shadow-2xl flex flex-col max-h-[90vh] border border-white/50">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black text-brand-text text-center tracking-tight">
                    {newOrder.id ? 'Editar Ordem' : 'Nova Ordem'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-black/5 text-brand-text"><X size={16}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-bold text-brand-muted uppercase ml-1 block mb-1">Cliente</label>
                          <input 
                            placeholder="Nome do Cliente"
                            className="w-full bg-gray-50 p-3.5 rounded-xl border-0 text-brand-text font-semibold focus:ring-2 focus:ring-brand-yellow outline-none text-sm"
                            value={newOrder.clientName || ''}
                            onChange={e => setNewOrder({...newOrder, clientName: e.target.value})}
                          />
                      </div>

                      <div>
                          <label className="text-[10px] font-bold text-brand-muted uppercase ml-1 block mb-1">Serviço(s)</label>
                          <div className="flex gap-2">
                            <textarea 
                                placeholder="Descreva os serviços ou selecione do catálogo..."
                                className="flex-1 bg-gray-50 p-3.5 rounded-xl border-0 text-brand-text font-semibold focus:ring-2 focus:ring-brand-yellow outline-none text-sm resize-none h-24"
                                value={newOrder.serviceDetails || ''}
                                onChange={e => setNewOrder({...newOrder, serviceDetails: e.target.value})}
                            />
                            <button 
                                onClick={() => setIsServiceSelectorOpen(true)}
                                className="w-12 bg-brand-yellow text-[#211D49] rounded-xl flex items-center justify-center shadow-md hover:bg-brand-gold transition active:scale-95"
                                title="Adicionar do Catálogo"
                            >
                                <PlusCircle size={24} />
                            </button>
                          </div>
                      </div>

                      {/* Custom Date Trigger */}
                      <div>
                          <label className="text-[10px] font-bold text-brand-muted uppercase ml-1 block mb-1">Data & Hora</label>
                          <button 
                            onClick={() => setIsDatePickerOpen(true)}
                            className="w-full bg-gray-50 p-3.5 rounded-xl border-0 text-brand-text font-bold text-sm focus:ring-2 focus:ring-brand-yellow outline-none text-left flex justify-between items-center"
                          >
                             <span>{newOrder.date || 'Agendar...'}</span>
                             <Calendar size={16} className="text-brand-yellow"/>
                          </button>
                      </div>
                      
                      <div>
                          <label className="text-[10px] font-bold text-brand-muted uppercase ml-1 block mb-1">Valor Total (Kz)</label>
                          <input 
                            type="number"
                            placeholder="0,00"
                            className="w-full bg-gray-50 p-3.5 rounded-xl border-0 text-brand-text font-black text-lg focus:ring-2 focus:ring-brand-yellow outline-none"
                            value={newOrder.price || ''}
                            onChange={e => setNewOrder({...newOrder, price: Number(e.target.value)})}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-brand-muted uppercase ml-1 block mb-1">Telefone</label>
                            <input 
                              placeholder="9xx..."
                              className="w-full bg-gray-50 p-3.5 rounded-xl border-0 text-brand-text text-sm focus:ring-2 focus:ring-brand-yellow outline-none"
                              value={newOrder.phone || ''}
                              onChange={e => setNewOrder({...newOrder, phone: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-brand-muted uppercase ml-1 block mb-1">Endereço</label>
                            <input 
                              placeholder="Local"
                              className="w-full bg-gray-50 p-3.5 rounded-xl border-0 text-brand-text text-sm focus:ring-2 focus:ring-brand-yellow outline-none"
                              value={newOrder.address || ''}
                              onChange={e => setNewOrder({...newOrder, address: e.target.value})}
                            />
                          </div>
                      </div>
                      
                      {newOrder.id && (
                        <div className="mt-2">
                             <label className="text-[10px] font-bold text-brand-muted uppercase ml-1 block mb-2">Estado Atual</label>
                             <div className="space-y-2">
                                {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'] as OrderStatus[]).map((statusOption) => {
                                   const isSelected = newOrder.status === statusOption;
                                   return (
                                     <button
                                       key={statusOption}
                                       onClick={() => setNewOrder({...newOrder, status: statusOption})}
                                       className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all ${
                                          isSelected 
                                            ? 'bg-brand-yellow text-[#211D49] shadow-md transform scale-[1.01]' 
                                            : 'bg-gray-50 text-brand-text hover:bg-black/5'
                                       }`}
                                     >
                                        <div className="flex items-center gap-3">
                                            {isSelected ? (
                                                <div className="w-5 h-5 bg-[#211D49] rounded-full flex items-center justify-center text-brand-yellow">
                                                    <Check size={12} strokeWidth={4} />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-brand-muted"></div>
                                            )}
                                            <span className={`text-sm font-bold ${isSelected ? 'text-[#211D49]' : 'text-brand-muted'}`}>
                                                {getStatusLabel(statusOption)}
                                            </span>
                                        </div>
                                     </button>
                                   )
                                })}
                             </div>
                        </div>
                      )}
                  </div>
              </div>

              <div className="flex gap-3 mt-8">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 text-brand-muted font-bold hover:bg-black/5 rounded-xl transition text-sm">Cancelar</button>
                 <button onClick={handleSaveOrder} className="flex-1 py-3.5 bg-brand-yellow text-[#211D49] rounded-xl font-bold shadow-lg hover:scale-105 transition text-sm">
                    {newOrder.id ? 'Salvar' : 'Criar'}
                 </button>
              </div>
           </div>
        </div>
      )}
      
      {/* Service Selector Bottom Sheet - Glass */}
      {isServiceSelectorOpen && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setIsServiceSelectorOpen(false)}></div>
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-6 animate-slide-up shadow-2xl relative z-10 max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 px-2">
                    <div>
                        <h3 className="text-xl font-black text-brand-text tracking-tight">Catálogo de Serviços</h3>
                        <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest mt-1">Toque para adicionar à ordem</p>
                    </div>
                    <button onClick={() => setIsServiceSelectorOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-brand-muted hover:text-brand-text transition">
                        <X size={16} />
                    </button>
                </div>

                {/* Categories Tabs - FILTERED */}
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
                    {serviceCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategorySelector(cat)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                activeCategorySelector === cat 
                                ? 'bg-brand-yellow text-[#211D49]' 
                                : 'bg-gray-50 text-brand-muted hover:bg-gray-100'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                
                <div className="overflow-y-auto space-y-2 pb-8 scrollbar-hide flex-1">
                    {filteredServices.length === 0 && (
                        <div className="text-center py-10 text-brand-muted font-medium bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                            Nenhum serviço nesta categoria.
                        </div>
                    )}
                    {filteredServices.map(item => (
                        <button
                        key={item.id}
                        onClick={() => handleAddServiceToOrder(item)}
                        className="w-full p-4 rounded-2xl flex justify-between items-center transition-all bg-gray-50 text-brand-text hover:bg-yellow-50 hover:border-yellow-200 border border-transparent active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                    <Tag size={18} className="text-brand-yellow"/>
                                </div>
                                <span className="font-bold text-sm text-left truncate">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-black text-[#211D49]">
                                    {formatMoney(item.price)}
                                </span>
                                <PlusCircle size={20} className="text-brand-yellow" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Custom Date/Time Picker Modal */}
      {isDatePickerOpen && (
          <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 animate-slide-up shadow-2xl border border-white/50">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-brand-text">Agendar Serviço</h3>
                      <button onClick={() => setIsDatePickerOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-100 text-brand-text transition"><X size={16}/></button>
                  </div>
                  
                  {/* Month Navigator */}
                  <div className="flex items-center justify-between mb-4">
                      <button onClick={() => changePickerMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
                      <span className="font-bold text-lg text-brand-text capitalize">
                          {pickerDate.toLocaleString('pt-AO', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => changePickerMonth(1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-6 text-center">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                          <div key={i} className="text-[10px] font-bold text-brand-muted uppercase">{day}</div>
                      ))}
                      {generateCalendarDays().map((day, i) => (
                          <button
                            key={i}
                            disabled={!day}
                            onClick={() => {
                                if(day) {
                                    const newD = new Date(pickerDate);
                                    newD.setDate(day);
                                    setPickerDate(newD);
                                }
                            }}
                            className={`
                                h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all
                                ${!day ? 'invisible' : ''}
                                ${day === pickerDate.getDate() ? 'bg-brand-yellow text-[#211D49] shadow-md' : 'text-brand-text hover:bg-gray-100'}
                            `}
                          >
                              {day}
                          </button>
                      ))}
                  </div>
                  
                  {/* Time Selector */}
                  <div className="mb-6">
                      <label className="text-[10px] font-bold text-brand-muted uppercase ml-1 block mb-2">Hora do Serviço</label>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                              <button
                                key={time}
                                onClick={() => setPickerTime(time)}
                                className={`
                                    px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border
                                    ${pickerTime === time ? 'bg-black text-white border-black' : 'bg-white border-gray-100 text-brand-text hover:border-gray-300'}
                                `}
                              >
                                  {time}
                              </button>
                          ))}
                      </div>
                  </div>

                  <button 
                    onClick={handleDateConfirm}
                    className="w-full py-4 bg-brand-yellow text-[#211D49] rounded-2xl font-bold shadow-lg hover:scale-[1.02] transition"
                  >
                      Confirmar Agendamento
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
                
                <h3 className="text-xl font-black text-brand-text text-center leading-tight mb-2">A Criar PDF</h3>
                <p className="text-brand-muted text-xs font-medium text-center mb-6">Processando o documento...</p>
                
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-yellow animate-[shimmer_1.5s_infinite_linear] w-[40%] rounded-full"></div>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default ServiceOrders;
