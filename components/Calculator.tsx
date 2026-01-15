
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Send, Sparkles, Check, ChevronDown, Download, PlusCircle, Fuel, User, Package, Layers, Plus, Loader2, FileText, X, MessageCircle, Trash2, Minus, MapPin, Clock, AlertTriangle, Phone, Home } from 'lucide-react';
import { ItemCategory, PriceTableItem, ServiceOrder } from '../types';
import { generateSalesProposal } from '../services/geminiService';
import { generateQuotePDF } from '../services/pdfService';
import { useData } from '../context/DataContext';

type ConditionLevel = 'NORMAL' | 'HEAVY' | 'EXTREME';

interface CartItem {
    item: PriceTableItem;
    quantity: number;
    condition: ConditionLevel;
}

const CONDITION_MULTIPLIERS = {
    'NORMAL': 1,
    'HEAVY': 1.2,   // +20%
    'EXTREME': 1.5  // +50%
};

const CONDITION_LABELS = {
    'NORMAL': 'Normal',
    'HEAVY': 'Sujidade Intensa',
    'EXTREME': 'Estado Crítico'
};

const ESTIMATED_TIMES: Record<string, number> = {
    [ItemCategory.SOFA]: 45, // mins per unit (seat logic approximated)
    [ItemCategory.CHAIR]: 20,
    [ItemCategory.MATTRESS]: 60,
    [ItemCategory.RUG]: 40,
    [ItemCategory.CURTAIN]: 30,
    [ItemCategory.VEHICLE]: 120,
    'default': 30
};

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

const Calculator: React.FC = () => {
  const { services, addOrder, pdfSettings, showNotification, generateDocId } = useData(); 

  // Derive categories ONLY from existing services or the Enum
  const serviceCategories = useMemo(() => {
      const activeCats = new Set(services.map(s => s.category));
      Object.values(ItemCategory).forEach(c => activeCats.add(c));
      return Array.from(activeCats);
  }, [services]);

  // State for Multiple Items
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Logistics State
  const [distanceKm, setDistanceKm] = useState(5);
  const [travelPrice, setTravelPrice] = useState(1000); 

  // Selector State
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [activeCategorySelector, setActiveCategorySelector] = useState<string>(ItemCategory.SOFA);

  // Condition Selector State (Custom UI)
  const [editingConditionIndex, setEditingConditionIndex] = useState<number | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  const [generatedProposal, setGeneratedProposal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  
  // Store the generated quote ID to reuse when saving order
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);

  // Update travel price suggestion when distance changes, but allow override
  useEffect(() => {
    const suggested = Math.max(1000, distanceKm * 200);
    setTravelPrice(suggested);
  }, [distanceKm]);

  // --- ACTIONS ---

  const addToCart = (service: PriceTableItem) => {
      setCart(prev => {
          const existing = prev.find(i => i.item.id === service.id && i.condition === 'NORMAL');
          if (existing) {
              return prev.map(i => (i.item.id === service.id && i.condition === 'NORMAL') ? { ...i, quantity: i.quantity + 1 } : i);
          }
          return [...prev, { item: service, quantity: 1, condition: 'NORMAL' }];
      });
      setIsSelectorOpen(false);
  };

  const removeFromCart = (index: number) => {
      setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
      setCart(prev => prev.map((item, i) => {
          if (i === index) {
              const newQty = Math.max(1, item.quantity + delta);
              return { ...item, quantity: newQty };
          }
          return item;
      }));
  };

  const updateCondition = (index: number, condition: ConditionLevel) => {
      setCart(prev => prev.map((item, i) => {
          if (i === index) return { ...item, condition };
          return item;
      }));
      setEditingConditionIndex(null); // Close modal
  };

  // --- CALCULATIONS ---

  const totals = useMemo(() => {
    let servicesSubtotal = 0;
    let totalTimeMinutes = 0;

    cart.forEach(cartItem => {
        const basePrice = cartItem.item.price;
        const multiplier = CONDITION_MULTIPLIERS[cartItem.condition];
        const itemTotal = basePrice * multiplier * cartItem.quantity;
        servicesSubtotal += itemTotal;

        // Time Calc
        const unitTime = ESTIMATED_TIMES[cartItem.item.category] || ESTIMATED_TIMES['default'];
        totalTimeMinutes += unitTime * cartItem.quantity;
    });

    const finalTotal = servicesSubtotal + travelPrice;

    // Costs Calculation (Estimated)
    const fuelCost = distanceKm * 150; 
    const laborCost = servicesSubtotal * 0.20; 
    const materialCost = servicesSubtotal * 0.10; 
    
    const estimatedCost = fuelCost + laborCost + materialCost;
    const estimatedProfit = finalTotal - estimatedCost;
    const profitMargin = finalTotal > 0 ? (estimatedProfit / finalTotal) * 100 : 0;

    return {
      servicesSubtotal,
      travelPrice,
      finalTotal,
      estimatedCost,
      estimatedProfit,
      profitMargin,
      totalTimeMinutes
    };
  }, [cart, travelPrice, distanceKm]);

  // --- GENERATION HANDLERS ---

  const getItemsSummary = () => {
      return cart.map(i => {
          const condText = i.condition !== 'NORMAL' ? `[${CONDITION_LABELS[i.condition]}]` : '';
          return `${i.item.label} ${condText} (x${i.quantity})`;
      }).join(', ');
  };

  const formatDuration = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h > 0 && m > 0) return `${h}h ${m}min`;
      if (h > 0) return `${h}h`;
      return `${m} min`;
  };

  const handleGenerateProposal = async () => {
    if (!clientName) return alert("Insira o nome do cliente.");
    if (cart.length === 0) return alert("Adicione itens ao orçamento.");
    
    setIsGenerating(true);
    
    const proposalData = {
        itemName: getItemsSummary(),
        quantity: cart.reduce((acc, curr) => acc + curr.quantity, 0),
        totalPrice: totals.finalTotal,
        hasImpermeabilization: false
    };

    const text = await generateSalesProposal(clientName, proposalData);
    setGeneratedProposal(text);
    setIsGenerating(false);
  };

  const handleDownloadPDF = async () => {
    if (!clientName) return alert("Insira o nome do cliente.");
    if (cart.length === 0) return alert("Adicione itens ao orçamento.");

    setIsDownloadingPdf(true);

    try {
        const pdfItems = [
            ...cart.map(cartItem => ({
                description: `${cartItem.item.label} (${CONDITION_LABELS[cartItem.condition]})`,
                quantity: cartItem.quantity,
                unitPrice: cartItem.item.price * CONDITION_MULTIPLIERS[cartItem.condition],
                total: (cartItem.item.price * CONDITION_MULTIPLIERS[cartItem.condition]) * cartItem.quantity
            })),
            {
                description: `Deslocação (${distanceKm}km)`,
                quantity: 1,
                unitPrice: travelPrice,
                total: travelPrice
            }
        ];
        
        // Generate new sequential ID
        const docId = generateDocId('QUOTE');
        setCurrentQuoteId(docId); // Save this ID to use when saving order

        const pdfFile = await generateQuotePDF(clientName, clientPhone, clientAddress, pdfItems, docId, pdfSettings);
        showNotification('PDF Pronto! Abrindo opções de partilha...', 'success');

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
                files: [pdfFile],
                title: 'Orçamento Mais Palma',
                text: `Olá ${clientName}, segue o orçamento solicitado (Ref: ${docId}).`
            });
        }

    } catch (error: any) {
        if (error.name === 'AbortError') {
             console.log('Compartilhamento cancelado pelo usuário');
             return;
        }
        console.error("Error generating PDF", error);
        showNotification('PDF Salvo em Downloads', 'info');
    } finally {
        setTimeout(() => setIsDownloadingPdf(false), 2000);
    }
  };

  const handleConfirmOrder = () => {
    if (!clientName) return alert("Insira o nome do cliente.");
    if (cart.length === 0) return alert("Adicione itens ao orçamento.");
    
    // Use the generated Quote ID if available, or generate one now
    const quoteRef = currentQuoteId || generateDocId('QUOTE');

    const newOrder: ServiceOrder = {
        id: Math.floor(10000 + Math.random() * 90000).toString(),
        clientName: clientName,
        serviceDetails: getItemsSummary(),
        price: totals.finalTotal,
        status: 'PENDING',
        date: new Date().toLocaleDateString('pt-AO'),
        address: clientAddress || `A definir (${distanceKm}km)`,
        phone: clientPhone || 'A definir',
        quoteRef: quoteRef
    };
    
    addOrder(newOrder);
    showNotification(`Pedido #${newOrder.id} salvo com Ref: ${quoteRef}`, 'success');
    
    // Reset form
    setClientName('');
    setClientPhone('');
    setClientAddress('');
    setCart([]);
    setGeneratedProposal('');
    setCurrentQuoteId(null);
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);
  };

  const filteredServices = services.filter(item => item.category === activeCategorySelector);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-2 px-2">
         <div>
            <h1 className="text-2xl font-black text-brand-text tracking-tight">Simulador</h1>
            <p className="text-brand-muted text-xs font-bold uppercase tracking-wider">Novo Orçamento</p>
         </div>
      </header>

      {/* Configuration Card */}
      <AnimatedItem index={0}>
        <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-soft overflow-hidden border border-white/50 p-6">
            
            {/* Logistics Section */}
            <div className="mb-8 grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1 mb-2 block">Distância</label>
                  <div className="relative group">
                      <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-yellow transition-colors pointer-events-none" size={16}/>
                      <input 
                          type="number" min="0"
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-8 py-3.5 font-bold text-brand-text text-sm focus:ring-2 focus:ring-brand-yellow outline-none transition-all shadow-sm"
                          value={distanceKm}
                          onChange={(e) => setDistanceKm(Number(e.target.value))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted text-[10px] font-bold">KM</span>
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1 mb-2 block">Taxa Deslocação</label>
                  <div className="relative group">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-yellow transition-colors pointer-events-none" size={16}/>
                      <input 
                          type="number" min="0"
                          className="w-full bg-white border border-yellow-100 rounded-2xl pl-10 pr-4 py-3.5 font-bold text-brand-text text-sm focus:ring-2 focus:ring-brand-yellow outline-none transition-all shadow-sm"
                          value={travelPrice}
                          onChange={(e) => setTravelPrice(Number(e.target.value))}
                      />
                  </div>
               </div>
            </div>

            {/* Cart List */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1">Itens Selecionados</label>
                  {cart.length > 0 && (
                      <button onClick={() => setCart([])} className="text-[10px] text-red-500 font-bold hover:underline">Limpar</button>
                  )}
                </div>
                
                {cart.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                        <Package size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-xs text-brand-muted font-bold">Nenhum serviço adicionado</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cart.map((cartItem, idx) => (
                            <div key={`${cartItem.item.id}-${idx}`} className="bg-gray-50 p-3 rounded-2xl border border-gray-100 animate-slide-up relative group">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="min-w-0 pr-2">
                                      <p className="font-bold text-sm text-brand-text truncate">{cartItem.item.label}</p>
                                      <p className="text-[10px] text-brand-muted font-medium">
                                          Base: {formatMoney(cartItem.item.price)}
                                      </p>
                                  </div>
                                  <button 
                                      onClick={() => removeFromCart(idx)}
                                      className="w-7 h-7 flex items-center justify-center text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    {/* Custom Condition Selector */}
                                    <button 
                                      onClick={() => setEditingConditionIndex(idx)}
                                      className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all active:scale-95 ${
                                          cartItem.condition === 'NORMAL' ? 'bg-white border-gray-200 text-gray-600' :
                                          cartItem.condition === 'HEAVY' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                                          'bg-red-50 border-red-200 text-red-600'
                                      }`}
                                    >
                                        <span className="truncate">{CONDITION_LABELS[cartItem.condition]}</span>
                                        <ChevronDown size={12} className="opacity-50 ml-1"/>
                                    </button>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100 shrink-0">
                                        <button 
                                          onClick={() => updateQuantity(idx, -1)}
                                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 text-brand-text transition"
                                        >
                                            <Minus size={12} strokeWidth={3}/>
                                        </button>
                                        <span className="text-xs font-black w-3 text-center">{cartItem.quantity}</span>
                                        <button 
                                          onClick={() => updateQuantity(idx, 1)}
                                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-brand-yellow text-[#211D49] hover:scale-105 transition"
                                        >
                                            <Plus size={12} strokeWidth={3}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button 
                  onClick={() => setIsSelectorOpen(true)}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-yellow-300 bg-yellow-50 text-yellow-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-yellow-100 transition"
                >
                    <Plus size={18} /> Adicionar Serviço
                </button>
            </div>
        </div>
      </AnimatedItem>

      {/* Totals Result - Receipt Style */}
      {cart.length > 0 && (
        <AnimatedItem index={1}>
            <div className="relative">
                <div className="absolute top-0 left-0 right-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAxMCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PHBhdGggZD0iTTAgMTBMMTAgMEwyMCAxMFoiIGZpbGw9InJnYmEoMCwwLDAsMC4wNSkiLz48L3N2Zz4=')] bg-repeat-x bg-[length:20px_10px] opacity-100 transform -translate-y-1/2 z-20"></div>

                <div className="bg-gray-50 p-6 pt-10 border-t-2 border-dashed border-gray-200 relative backdrop-blur-md rounded-b-[2.5rem] shadow-soft">
                
                <div className="mb-8 text-center">
                    <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Total Estimado</p>
                    <div className="inline-block relative">
                        <h3 className="text-4xl sm:text-5xl font-black text-brand-text tracking-tighter drop-shadow-sm">{formatMoney(totals.finalTotal)}</h3>
                        <div className="absolute -right-6 -top-2 text-brand-yellow animate-pulse">
                            <Sparkles size={16} fill="currentColor"/>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Package size={10} /> {cart.length} itens
                        </span>
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Clock size={10} /> ~{formatDuration(totals.totalTimeMinutes)}
                        </span>
                    </div>
                </div>

                {/* Profit Bar */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-inner">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-brand-muted font-bold uppercase">Rentabilidade</span>
                        <span className="text-xs font-bold text-brand-text">{formatMoney(totals.estimatedProfit)}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full mb-1 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,214,10,0.5)]" 
                            style={{width: `${totals.profitMargin}%`}}
                        ></div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-yellow-600">{totals.profitMargin.toFixed(0)}% Margem</span>
                    </div>
                </div>
            </div>
            </div>
        </AnimatedItem>
      )}

      {/* Action Tools - Glass Effect */}
      <AnimatedItem index={2}>
        <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-soft border border-white/50 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 text-yellow-700 p-3 rounded-2xl shadow-sm shrink-0">
                        <User size={20} fill="currentColor" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="font-bold text-brand-text text-base leading-none">Dados do Cliente</h3>
                        <p className="text-[10px] text-brand-muted mt-1 font-medium">Obrigatório para gerar documentos</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-3">
                <div className="relative">
                    <input 
                        type="text"
                        placeholder="Nome Completo *"
                        className="w-full bg-gray-50 border border-gray-100 focus:border-yellow-300 rounded-2xl px-5 py-4 text-sm font-bold text-brand-text focus:ring-4 focus:ring-yellow-100 outline-none transition-all placeholder:text-brand-muted/50"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                    />
                </div>
                
                {/* Additional Optional Fields for PDF */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" size={16}/>
                        <input 
                            type="text"
                            placeholder="Telefone"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-medium text-brand-text focus:ring-2 focus:ring-yellow-100 outline-none"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" size={16}/>
                        <input 
                            type="text"
                            placeholder="Endereço"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-medium text-brand-text focus:ring-2 focus:ring-yellow-100 outline-none"
                            value={clientAddress}
                            onChange={(e) => setClientAddress(e.target.value)}
                        />
                    </div>
                </div>

                {generatedProposal ? (
                    <div className="animate-slide-up bg-green-50 rounded-3xl p-6 border border-green-100 mb-4 shadow-inner relative overflow-hidden mt-4">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><MessageCircle size={100} /></div>
                        <div className="flex justify-between items-center mb-4 relative z-10">
                            <span className="text-[10px] font-black text-green-600 uppercase tracking-wide bg-green-100 px-2 py-1 rounded">WhatsApp Preview</span>
                            <button onClick={() => setGeneratedProposal('')} className="text-[10px] text-brand-muted font-bold hover:text-red-500 transition">LIMPAR</button>
                        </div>
                        <textarea 
                            className="w-full bg-transparent text-sm text-brand-text h-28 resize-none outline-none mb-3 font-medium relative z-10"
                            value={generatedProposal}
                            readOnly
                        />
                        <a 
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(generatedProposal)}`}
                            target="_blank"
                            className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/20 hover:scale-[1.02] transition relative z-10"
                        >
                            <Send size={18} /> Enviar Agora
                        </a>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                            onClick={handleGenerateProposal}
                            disabled={isGenerating}
                            className="col-span-1 py-4 bg-brand-yellow text-[#211D49] rounded-2xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-yellow-400 hover:shadow-glow transition disabled:opacity-50 group"
                        >
                            {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} strokeWidth={1.5} className="group-hover:animate-pulse" />}
                            <span className="text-[10px] uppercase tracking-wide font-black">Copy IA</span>
                        </button>
                        <button 
                            onClick={handleDownloadPDF}
                            className="col-span-1 py-4 bg-gray-50 border border-gray-100 text-brand-text rounded-2xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-white transition group"
                        >
                            <Download size={24} strokeWidth={1.5} className="text-brand-muted group-hover:text-brand-text transition-colors" />
                            <span className="text-[10px] uppercase tracking-wide font-black text-brand-muted group-hover:text-brand-text transition-colors">Orçamento</span>
                        </button>
                        
                        <button 
                            onClick={handleConfirmOrder}
                            className="col-span-2 py-5 bg-white text-[#211D49] rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-[1.01] transition shadow-lg border border-gray-100"
                        >
                            <Check size={18} strokeWidth={3} /> Salvar Pedido
                        </button>
                    </div>
                )}
            </div>
        </div>
      </AnimatedItem>

      {/* Service Selector Bottom Sheet - Glass */}
      {isSelectorOpen && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setIsSelectorOpen(false)}></div>
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-6 animate-slide-up shadow-2xl relative z-10 max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 px-2">
                    <div>
                        <h3 className="text-xl font-black text-brand-text tracking-tight">Adicionar Item</h3>
                        <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest mt-1">Selecione para adicionar</p>
                    </div>
                    <button onClick={() => setIsSelectorOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-brand-muted hover:text-brand-text transition">
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
                    {filteredServices.map(opt => (
                        <button
                        key={opt.id}
                        onClick={() => addToCart(opt)}
                        className="w-full p-4 rounded-2xl flex justify-between items-center transition-all bg-gray-50 text-brand-text hover:bg-yellow-50 hover:border-yellow-200 border border-transparent active:scale-[0.98]"
                        >
                            <span className="font-bold text-sm text-left truncate flex-1 mr-2">{opt.label}</span>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-black text-[#211D49] bg-white px-2 py-1 rounded-lg shadow-sm">
                                    {formatMoney(opt.price)}
                                </span>
                                <PlusCircle size={20} className="text-brand-yellow" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* NEW Condition Selector Bottom Sheet - Glass */}
      {editingConditionIndex !== null && (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setEditingConditionIndex(null)}></div>
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-8 animate-slide-up shadow-2xl relative z-10 border-t border-white/50">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-black text-brand-text tracking-tight">Estado do Item</h3>
                        <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest mt-1">
                            {cart[editingConditionIndex].item.label}
                        </p>
                    </div>
                    <button onClick={() => setEditingConditionIndex(null)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-brand-muted hover:text-brand-text transition">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-3 pb-6">
                    {(['NORMAL', 'HEAVY', 'EXTREME'] as ConditionLevel[]).map((level) => {
                        const isSelected = cart[editingConditionIndex].condition === level;
                        return (
                            <button
                                key={level}
                                onClick={() => updateCondition(editingConditionIndex, level)}
                                className={`w-full p-4 rounded-2xl flex justify-between items-center transition-all active:scale-[0.98] ${
                                    isSelected
                                    ? 'bg-brand-yellow text-[#211D49] shadow-lg'
                                    : 'bg-gray-50 text-brand-text hover:bg-gray-100'
                                }`}
                            >
                                <div className="flex flex-col items-start">
                                    <span className="font-bold text-sm">{CONDITION_LABELS[level]}</span>
                                    {level === 'HEAVY' && <span className="text-[10px] opacity-70 font-semibold">+20% no valor</span>}
                                    {level === 'EXTREME' && <span className="text-[10px] opacity-70 font-semibold">+50% no valor</span>}
                                </div>
                                {isSelected ? (
                                    <div className="w-6 h-6 bg-[#211D49] rounded-full flex items-center justify-center text-brand-yellow">
                                        <Check size={14} strokeWidth={4} />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
      )}

      {/* Elegant PDF Downloading Modal (App-like appearance) */}
      {isDownloadingPdf && (
          <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
             <div className="bg-white rounded-[3rem] p-10 w-full max-w-xs shadow-2xl flex flex-col items-center animate-slide-up relative overflow-hidden border border-white/50">
                
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-8 relative shadow-inner">
                    <Loader2 size={40} className="text-brand-yellow animate-spin absolute" strokeWidth={2}/>
                    <img 
                      src="https://i.postimg.cc/6q6K9xSV/Imagotipo_V_2.png" 
                      alt="Logo" 
                      className="w-8 h-8 object-contain opacity-50"
                    />
                </div>
                
                <h3 className="text-2xl font-black text-brand-text text-center leading-tight mb-2 tracking-tight">Criando PDF</h3>
                <p className="text-brand-muted text-xs font-bold uppercase tracking-widest text-center mb-8">Aguarde um momento</p>
                
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-yellow animate-[shimmer_1.5s_infinite_linear] w-[50%] rounded-full shadow-[0_0_10px_#F3A421]"></div>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default Calculator;
