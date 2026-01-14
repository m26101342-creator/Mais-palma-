
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Crown, Phone, MessageCircle, Calendar, ArrowRight, X, User, Camera, Image as ImageIcon, Save, Trash2, Edit3, StickyNote } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ServiceOrder } from '../types';

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

interface ClientProfile {
    name: string;
    phone: string;
    address: string;
    totalSpent: number;
    orderCount: number;
    lastOrderDate: string;
    orders: ServiceOrder[];
    isVip: boolean;
}

// Image compression helper
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality JPEG
            };
        };
        reader.onerror = error => reject(error);
    });
};

const Clients: React.FC = () => {
  const { orders, updateOrder } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  
  // Photo Editing State
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [tempBefore, setTempBefore] = useState<string | undefined>(undefined);
  const [tempAfter, setTempAfter] = useState<string | undefined>(undefined);

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  // Process Orders into Clients (Recalculate when orders change)
  const clients = useMemo(() => {
      const map: Record<string, ClientProfile> = {};

      orders.forEach(order => {
          const normalizedName = order.clientName.trim();
          
          if (!map[normalizedName]) {
              map[normalizedName] = {
                  name: normalizedName,
                  phone: order.phone,
                  address: order.address,
                  totalSpent: 0,
                  orderCount: 0,
                  lastOrderDate: order.date,
                  orders: [],
                  isVip: false
              };
          }

          const client = map[normalizedName];
          client.totalSpent += order.price;
          client.orderCount += 1;
          client.orders.push(order);
          
          client.phone = order.phone && order.phone.length > 5 ? order.phone : client.phone;
          client.address = order.address && order.address.length > 5 ? order.address : client.address;
      });

      let clientList = Object.values(map);
      clientList.sort((a, b) => b.totalSpent - a.totalSpent);
      clientList.forEach((c, index) => {
          if (index < 3 && c.totalSpent > 0) c.isVip = true;
      });

      return clientList;
  }, [orders]);

  // Update selected client reference when data changes in background
  useEffect(() => {
      if (selectedClient) {
          const updated = clients.find(c => c.name === selectedClient.name);
          if (updated) setSelectedClient(updated);
      }
  }, [clients]);

  const filteredClients = clients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const openWhatsApp = (client: ClientProfile) => {
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return alert('Número inválido');
    const finalPhone = cleanPhone.length <= 9 ? `244${cleanPhone}` : cleanPhone;
    const message = `Olá ${client.name.split(' ')[0]}! Tudo bem? Aqui é da Mais Palma.`;
    window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEditService = (order: ServiceOrder) => {
      setEditingOrderId(order.id);
      setTempNotes(order.notes || '');
      setTempBefore(order.photos?.before);
      setTempAfter(order.photos?.after);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
      if (e.target.files && e.target.files[0]) {
          try {
              const compressed = await compressImage(e.target.files[0]);
              if (type === 'before') setTempBefore(compressed);
              else setTempAfter(compressed);
          } catch (err) {
              alert("Erro ao carregar imagem");
          }
      }
  };

  const saveServiceDetails = () => {
      if (!editingOrderId || !selectedClient) return;
      
      const orderToUpdate = selectedClient.orders.find(o => o.id === editingOrderId);
      if (orderToUpdate) {
          updateOrder({
              ...orderToUpdate,
              notes: tempNotes,
              photos: {
                  before: tempBefore,
                  after: tempAfter
              }
          });
      }
      setEditingOrderId(null);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <header className="flex flex-col gap-4 mb-4 bg-white/90 backdrop-blur-md p-6 rounded-[2.5rem] shadow-soft border border-white/50 sticky top-0 z-20">
         <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-black text-brand-text tracking-tight">Clientes</h2>
                <p className="text-xs text-brand-muted font-bold uppercase tracking-wide">
                    {clients.length} Cadastrados
                </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-brand-muted">
                <User size={24} />
            </div>
         </div>
         
         <div className="relative">
             <Search className="absolute left-4 top-3.5 text-brand-muted" size={20}/>
             <input 
               placeholder="Buscar cliente..."
               className="w-full bg-gray-50 border-0 rounded-2xl pl-12 pr-4 py-3.5 font-semibold text-brand-text focus:ring-2 focus:ring-brand-yellow outline-none transition-all"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
         </div>
      </header>

      {/* Top Clients Cards */}
      {!searchTerm && clients.length > 0 && (
          <AnimatedItem index={0}>
            <div className="mb-6">
                <h3 className="text-sm font-black text-brand-text uppercase tracking-wider mb-3 ml-2">Top Clientes VIP</h3>
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                    {clients.slice(0, 3).map((client, idx) => (
                        <div key={idx} onClick={() => setSelectedClient(client)} className="min-w-[160px] bg-gradient-to-br from-[#211D49] to-[#2F2A5F] p-4 rounded-3xl shadow-lg relative overflow-hidden group cursor-pointer transition-transform active:scale-95">
                            <div className="absolute top-0 right-0 p-3 opacity-10"><Crown size={40} className="text-white"/></div>
                            <div className="w-10 h-10 rounded-full bg-brand-yellow text-[#211D49] flex items-center justify-center font-black text-sm mb-3 shadow-md border-2 border-[#211D49]">
                                {client.name.substring(0,2).toUpperCase()}
                            </div>
                            <p className="text-white font-bold text-sm truncate mb-1">{client.name.split(' ')[0]}</p>
                            <p className="text-brand-yellow font-black text-xs">{formatMoney(client.totalSpent)}</p>
                            <div className="mt-3 flex items-center gap-1 text-[10px] text-gray-300">
                                <span className="bg-white/10 px-2 py-0.5 rounded-md">{client.orderCount} serviços</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </AnimatedItem>
      )}

      {/* Clients List */}
      <div className="space-y-3">
          {filteredClients.length === 0 && (
             <div className="text-center py-10 opacity-50">
                <p className="text-brand-muted font-bold text-sm">Nenhum cliente encontrado.</p>
             </div>
          )}

          {filteredClients.map((client, index) => (
             <AnimatedItem key={index} index={index + 1}>
                 <div 
                    onClick={() => setSelectedClient(client)}
                    className="bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-soft flex items-center justify-between group border border-transparent hover:border-yellow-200 transition-all cursor-pointer active:scale-[0.98]"
                 >
                     <div className="flex items-center gap-4 overflow-hidden">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm shrink-0 ${client.isVip ? 'bg-brand-yellow text-[#211D49]' : 'bg-gray-100 text-brand-muted'}`}>
                             {client.name.substring(0,2).toUpperCase()}
                         </div>
                         <div className="min-w-0">
                             <div className="flex items-center gap-2">
                                <h4 className="font-bold text-brand-text text-base truncate">{client.name}</h4>
                                {client.isVip && <Crown size={12} className="text-brand-yellow fill-brand-yellow" />}
                             </div>
                             <div className="flex items-center gap-2 text-[10px] text-brand-muted font-medium mt-0.5">
                                 <span>{client.orderCount} ordens</span>
                                 <span>•</span>
                                 <span>Última: {client.lastOrderDate.split(' ')[0]}</span>
                             </div>
                         </div>
                     </div>
                     <div className="flex flex-col items-end gap-1">
                         <span className="font-black text-brand-text text-sm">{formatMoney(client.totalSpent)}</span>
                         <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-brand-muted group-hover:bg-brand-yellow group-hover:text-[#211D49] transition-colors">
                             <ArrowRight size={16} />
                         </div>
                     </div>
                 </div>
             </AnimatedItem>
          ))}
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setSelectedClient(null)}></div>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden animate-slide-up shadow-2xl relative z-10 max-h-[90vh] flex flex-col">
                
                {/* Modal Header */}
                <div className="bg-[#211D49] p-8 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Crown size={100} /></div>
                    <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition"><X size={20}/></button>
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl mb-4 shadow-xl border-4 border-[#2F2A5F] ${selectedClient.isVip ? 'bg-brand-yellow text-[#211D49]' : 'bg-white/20 text-white'}`}>
                            {selectedClient.name.substring(0,2).toUpperCase()}
                        </div>
                        <h2 className="text-2xl font-black tracking-tight leading-none mb-1">{selectedClient.name}</h2>
                        {selectedClient.isVip && <span className="bg-brand-yellow text-[#211D49] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Cliente VIP</span>}
                        
                        <div className="grid grid-cols-3 gap-4 mt-6 w-full">
                            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-md">
                                <p className="text-[10px] text-gray-300 uppercase font-bold">Total Gasto</p>
                                <p className="font-bold text-sm">{formatMoney(selectedClient.totalSpent)}</p>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-md">
                                <p className="text-[10px] text-gray-300 uppercase font-bold">Serviços</p>
                                <p className="font-bold text-sm">{selectedClient.orderCount}</p>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-md">
                                <p className="text-[10px] text-gray-300 uppercase font-bold">Última Vez</p>
                                <p className="font-bold text-sm">{selectedClient.lastOrderDate.split(' ')[0].substring(0,5)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="bg-white p-4 rounded-3xl shadow-sm mb-6 flex justify-between items-center border border-gray-100">
                        <div>
                            <p className="text-[10px] font-bold text-brand-muted uppercase">Contato</p>
                            <p className="font-bold text-brand-text">{selectedClient.phone || 'Sem telefone'}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openWhatsApp(selectedClient)} className="w-10 h-10 bg-[#25D366] text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition">
                                <MessageCircle size={20} />
                            </button>
                            <button onClick={() => window.open(`tel:${selectedClient.phone}`)} className="w-10 h-10 bg-brand-yellow text-[#211D49] rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition">
                                <Phone size={20} />
                            </button>
                        </div>
                    </div>

                    <h3 className="text-sm font-black text-brand-text uppercase tracking-wider mb-3 ml-2">Histórico de Serviços</h3>
                    <div className="space-y-4 pb-8">
                        {selectedClient.orders.map((order) => (
                            <div key={order.id} className="bg-white p-5 rounded-3xl border border-gray-100 relative group overflow-hidden">
                                {editingOrderId === order.id ? (
                                    // EDITING MODE
                                    <div className="animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-black text-sm text-[#211D49]">Editar Detalhes</h4>
                                            <button onClick={() => setEditingOrderId(null)} className="p-1.5 bg-gray-100 rounded-full"><X size={14}/></button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-brand-muted block">Antes</label>
                                                <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-brand-yellow transition flex flex-col items-center justify-center group/upload">
                                                    {tempBefore ? (
                                                        <>
                                                            <img src={tempBefore} className="w-full h-full object-cover" />
                                                            <button onClick={() => setTempBefore(undefined)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><X size={10}/></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Camera size={20} className="text-gray-400 mb-1"/>
                                                            <span className="text-[9px] font-bold text-gray-400">Add Foto</span>
                                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'before')} />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-brand-muted block">Depois</label>
                                                <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-brand-yellow transition flex flex-col items-center justify-center group/upload">
                                                    {tempAfter ? (
                                                        <>
                                                            <img src={tempAfter} className="w-full h-full object-cover" />
                                                            <button onClick={() => setTempAfter(undefined)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><X size={10}/></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ImageIcon size={20} className="text-gray-400 mb-1"/>
                                                            <span className="text-[9px] font-bold text-gray-400">Add Foto</span>
                                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'after')} />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="text-[10px] font-bold uppercase text-brand-muted block mb-1">Notas do Serviço</label>
                                            <textarea 
                                                className="w-full bg-gray-50 rounded-xl p-3 text-xs font-medium border-0 focus:ring-2 focus:ring-brand-yellow outline-none resize-none"
                                                rows={2}
                                                placeholder="Detalhes sobre a limpeza..."
                                                value={tempNotes}
                                                onChange={(e) => setTempNotes(e.target.value)}
                                            />
                                        </div>

                                        <button 
                                            onClick={saveServiceDetails}
                                            className="w-full py-3 bg-brand-yellow text-[#211D49] rounded-xl font-bold text-xs shadow-md hover:scale-[1.02] transition flex items-center justify-center gap-2"
                                        >
                                            <Save size={14} /> Salvar Alterações
                                        </button>
                                    </div>
                                ) : (
                                    // VIEW MODE
                                    <>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="font-bold text-brand-text text-sm mb-0.5 line-clamp-1">{order.serviceDetails}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-brand-muted font-bold">
                                                    <span className={`px-1.5 py-0.5 rounded ${
                                                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>{order.status}</span>
                                                    <span>• {order.date}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="font-bold text-brand-text text-sm">{formatMoney(order.price)}</span>
                                                <button 
                                                    onClick={() => handleEditService(order)}
                                                    className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-brand-muted hover:bg-brand-yellow hover:text-[#211D49] transition"
                                                    title="Editar Detalhes"
                                                >
                                                    <Edit3 size={14}/>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Photos Preview */}
                                        {(order.photos?.before || order.photos?.after) && (
                                            <div className="flex gap-2 mb-3">
                                                {order.photos.before && (
                                                    <div className="flex-1 relative aspect-video rounded-xl overflow-hidden group/img">
                                                        <span className="absolute top-1 left-1 bg-black/50 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded">ANTES</span>
                                                        <img src={order.photos.before} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                {order.photos.after && (
                                                    <div className="flex-1 relative aspect-video rounded-xl overflow-hidden group/img">
                                                        <span className="absolute top-1 left-1 bg-green-500/80 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded">DEPOIS</span>
                                                        <img src={order.photos.after} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Notes Preview */}
                                        {order.notes && (
                                            <div className="bg-yellow-50 p-3 rounded-xl flex gap-2 items-start">
                                                <StickyNote size={14} className="text-yellow-600 mt-0.5 shrink-0"/>
                                                <p className="text-xs text-yellow-800 font-medium line-clamp-3">{order.notes}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
