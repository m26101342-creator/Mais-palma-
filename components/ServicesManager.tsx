import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, Tag, Search, X, Pencil, RotateCcw, ChevronDown, Check, Layers, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ItemCategory, PriceTableItem } from '../types';

// Componente interno para animação de scroll
interface AnimatedServiceItemProps {
  children: React.ReactNode;
  index: number;
}

const AnimatedServiceItem: React.FC<AnimatedServiceItemProps> = ({ children, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Para de observar assim que aparecer para economizar recursos
          if (elementRef.current) observer.unobserve(elementRef.current);
        }
      },
      {
        threshold: 0.15, // Gatilho quando 15% do item estiver visível
        rootMargin: '30px' // Começa a animar um pouco antes de entrar na tela
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) observer.unobserve(elementRef.current);
    };
  }, []);

  return (
    <div 
      ref={elementRef}
      className={`transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1) transform ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100 blur-0' 
          : 'opacity-0 translate-y-12 scale-[0.96] blur-sm'
      }`}
      style={{ transitionDelay: `${(index % 5) * 60}ms` }} // Efeito cascata
    >
      {children}
    </div>
  );
};

const ServicesManager: React.FC = () => {
  const { services, addService, updateService, removeService, resetServices, addCategory } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  // Form State
  const [newService, setNewService] = useState<Partial<PriceTableItem>>({ category: ItemCategory.SOFA });
  const [newCategoryName, setNewCategoryName] = useState('');

  // Filtrar categorias para mostrar apenas as que são realmente de serviços
  const serviceCategories = useMemo(() => {
    const activeCats = new Set(services.map(s => s.category));
    Object.values(ItemCategory).forEach(c => activeCats.add(c));
    return Array.from(activeCats);
  }, [services]);

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  const filteredServices = services.filter(s => 
    s.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
      if(!newService.label || !newService.price) return;
      
      const finalCategory = newService.category || 'Geral';

      if (newService.id) {
          // Edit Mode
          updateService({ ...newService, category: finalCategory } as PriceTableItem);
      } else {
          // Create Mode
          const item: PriceTableItem = {
              id: `custom_${Date.now()}`,
              label: newService.label,
              price: Number(newService.price),
              category: finalCategory
          };
          addService(item);
      }
      
      setIsModalOpen(false);
      setNewService({ category: ItemCategory.SOFA, label: '', price: '' as any });
  };

  const handleEdit = (item: PriceTableItem) => {
      setNewService({ ...item });
      setIsModalOpen(true);
  };

  const handleResetTrigger = () => {
      setIsResetModalOpen(true);
  };

  const confirmReset = () => {
      resetServices();
      setIsResetModalOpen(false);
  };

  const openNewModal = () => {
      setNewService({ category: ItemCategory.SOFA, label: '', price: '' as any });
      setIsModalOpen(true);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    addCategory(newCategoryName);
    setNewService({ ...newService, category: newCategoryName });
    setNewCategoryName('');
    setIsCategorySelectorOpen(false);
  };

  const handleSelectCategory = (cat: string) => {
    setNewService({ ...newService, category: cat });
    setIsCategorySelectorOpen(false);
  };

  return (
    <div className="space-y-6 pb-32">
       {/* Header - Glass */}
       <header className="flex justify-between items-center mb-6 bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] shadow-soft border border-white/50 sticky top-0 z-20 transition-all duration-300">
        <div>
            <h2 className="text-2xl font-black text-brand-text tracking-tight">Serviços</h2>
            <p className="text-xs text-brand-muted font-bold uppercase tracking-wide">Catálogo de Preços</p>
        </div>
        <div className="flex gap-2">
            <button 
            onClick={handleResetTrigger}
            className="w-12 h-12 bg-gray-100 rounded-full shadow-sm flex items-center justify-center hover:bg-black/5 transition"
            title="Restaurar Padrão"
            >
            <RotateCcw size={20} className="text-brand-muted" />
            </button>
            <button 
            onClick={openNewModal}
            className="w-12 h-12 bg-brand-yellow text-[#211D49] rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition"
            >
            <Plus size={24} />
            </button>
        </div>
      </header>

      {/* Search - Glass */}
      <div className="relative z-10">
          <Search className="absolute left-4 top-3.5 text-brand-muted" size={20}/>
          <input 
            type="text"
            placeholder="Buscar serviço..."
            className="w-full bg-white/80 border border-white/60 rounded-[1.5rem] pl-12 pr-4 py-3.5 text-sm font-semibold text-brand-text focus:ring-2 focus:ring-brand-yellow outline-none shadow-sm backdrop-blur-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      {/* List - Glass Items with Animation */}
      <div className="space-y-3 min-h-[50vh]">
          {filteredServices.length === 0 && (
              <div className="text-center py-10 text-brand-muted font-medium bg-white/50 rounded-3xl border border-dashed border-gray-200 mt-4">
                  Nenhum serviço encontrado.
              </div>
          )}
          
          {filteredServices.map((service, index) => (
              <AnimatedServiceItem key={service.id} index={index}>
                  <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-soft flex justify-between items-center group border border-transparent hover:border-white/50 transition-all">
                      <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-brand-text group-hover:bg-brand-yellow group-hover:text-[#211D49] transition-colors duration-300 shrink-0">
                              <Tag size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-brand-text text-sm truncate">{service.label}</h4>
                              <div className="flex">
                                <span className="text-[8px] bg-brand-yellow/20 text-yellow-800 px-2 py-0.5 rounded font-black uppercase tracking-wider truncate max-w-full">{service.category}</span>
                              </div>
                          </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-brand-text text-xs sm:text-sm whitespace-nowrap mr-1">{formatMoney(service.price)}</span>
                          
                          <button 
                            onClick={() => handleEdit(service)}
                            className="w-8 h-8 rounded-full bg-gray-100 text-brand-muted flex items-center justify-center transition-all hover:bg-brand-yellow hover:text-[#211D49] shrink-0"
                            title="Editar"
                          >
                              <Pencil size={14} />
                          </button>

                          <button 
                            onClick={() => removeService(service.id)}
                            className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center transition-all hover:bg-red-500 hover:text-white shrink-0"
                            title="Excluir"
                          >
                              <Trash2 size={14} />
                          </button>
                      </div>
                  </div>
              </AnimatedServiceItem>
          ))}
      </div>

      {/* Add/Edit Service Modal - Glass */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 animate-slide-up shadow-2xl flex flex-col max-h-[90vh] border border-white/50">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-brand-text tracking-tight">
                      {newService.id ? 'Editar Item' : 'Novo Item'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-black/5 text-brand-text"><X size={16}/></button>
              </div>
              
              <div className="space-y-5">
                  <div>
                      <label className="text-xs font-bold text-brand-muted uppercase ml-1 block mb-1">Nome</label>
                      <input 
                        className="w-full bg-gray-50 p-4 rounded-xl border-0 text-brand-text font-semibold focus:ring-2 focus:ring-brand-yellow outline-none"
                        placeholder="Ex: Tapete Persa"
                        value={newService.label || ''}
                        onChange={(e) => setNewService({...newService, label: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-brand-muted uppercase ml-1 block mb-1">Preço (Kz)</label>
                      <input 
                        type="number"
                        className="w-full bg-gray-50 p-4 rounded-xl border-0 text-brand-text font-bold text-lg focus:ring-2 focus:ring-brand-yellow outline-none"
                        placeholder="0"
                        value={newService.price || ''}
                        onChange={(e) => setNewService({...newService, price: Number(e.target.value)})}
                      />
                  </div>
                  
                  {/* Custom Category Selector Trigger */}
                  <div>
                      <label className="text-xs font-bold text-brand-muted uppercase ml-1 block mb-1">Categoria</label>
                      <button 
                        onClick={() => setIsCategorySelectorOpen(true)}
                        className="w-full bg-gray-50 p-4 rounded-xl border-0 text-brand-text font-bold text-sm focus:ring-2 focus:ring-brand-yellow outline-none flex justify-between items-center text-left"
                      >
                        <div className="flex items-center gap-2">
                            <Layers size={16} className="text-brand-yellow" />
                            <span>{newService.category}</span>
                        </div>
                        <ChevronDown size={16} className="text-brand-muted"/>
                      </button>
                  </div>
              </div>

              <button 
                onClick={handleSave} 
                className="mt-8 w-full py-4 bg-brand-yellow text-[#211D49] rounded-xl font-bold shadow-lg hover:scale-105 transition flex items-center justify-center gap-2"
              >
                {newService.id ? <Pencil size={20} /> : <Plus size={20} />} 
                {newService.id ? 'Salvar Alterações' : 'Adicionar ao Catálogo'}
              </button>
           </div>
        </div>
      )}

      {/* Reset Confirmation Modal - Custom UI */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 animate-slide-up shadow-2xl flex flex-col border border-white/50">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto text-red-500">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-brand-text text-center mb-2 tracking-tight">Restaurar Padrão?</h3>
                <p className="text-sm text-brand-muted text-center font-medium mb-8 leading-relaxed">
                    Tem certeza que deseja restaurar a tabela de preços original? Todas as alterações personalizadas serão perdidas.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsResetModalOpen(false)} 
                        className="flex-1 py-3.5 bg-gray-50 text-brand-muted font-bold rounded-xl hover:bg-gray-100 transition text-sm"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmReset} 
                        className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold shadow-lg hover:bg-red-600 hover:scale-[1.02] transition text-sm"
                    >
                        Sim, Restaurar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Category Selector Bottom Sheet - Glass */}
      {isCategorySelectorOpen && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setIsCategorySelectorOpen(false)}></div>
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-6 animate-slide-up shadow-2xl relative z-10 max-h-[85vh] flex flex-col border-t border-white/50">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="text-xl font-black text-brand-text tracking-tight">Escolher Categoria</h3>
                    <button onClick={() => setIsCategorySelectorOpen(false)} className="p-2 bg-gray-100 rounded-full text-brand-muted hover:bg-black/5 transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-4 flex gap-2">
                   <input 
                      className="flex-1 bg-gray-50 px-4 py-3 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-yellow outline-none text-brand-text"
                      placeholder="Criar nova categoria..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                   />
                   <button 
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim()}
                      className="bg-brand-yellow text-[#211D49] px-4 rounded-xl font-bold disabled:opacity-50"
                   >
                      <Plus size={20} />
                   </button>
                </div>
                
                <div className="overflow-y-auto space-y-2 pb-8 scrollbar-hide">
                    {serviceCategories.map(cat => (
                        <button
                        key={cat}
                        onClick={() => handleSelectCategory(cat)}
                        className={`w-full p-4 rounded-2xl flex justify-between items-center transition-all ${
                            newService.category === cat 
                            ? 'bg-brand-yellow text-[#211D49] shadow-lg transform scale-[1.02]' 
                            : 'bg-gray-50 text-brand-text hover:bg-gray-100'
                        }`}
                        >
                          <span className="font-bold text-sm text-left">{cat}</span>
                          {newService.category === cat && <Check size={18} className="text-[#211D49]" strokeWidth={3} />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ServicesManager;