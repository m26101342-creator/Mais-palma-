
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock, User, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { OrderStatus } from '../types';

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

const Agenda: React.FC = () => {
  const { orders } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 = Sunday

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const formatDateKey = (date: Date) => {
    return date.toLocaleDateString('pt-AO'); // returns DD/MM/YYYY usually
  };

  // Organize orders by date
  const ordersByDate = useMemo(() => {
    const map: Record<string, typeof orders> = {};
    
    orders.forEach(order => {
        // Order date format might be "DD/MM/YYYY" or "DD/MM/YYYY às HH:mm"
        const datePart = order.date.split(' às ')[0]; // Extract just the date part
        if (!map[datePart]) {
            map[datePart] = [];
        }
        map[datePart].push(order);
    });
    return map;
  }, [orders]);

  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDayOrders = ordersByDate[selectedDateKey] || [];

  const days = useMemo(() => {
      const daysInMonth = getDaysInMonth(currentDate);
      const firstDay = getFirstDayOfMonth(currentDate);
      const daysArray = [];

      // Empty slots
      for (let i = 0; i < firstDay; i++) {
          daysArray.push(null);
      }
      
      // Actual days
      for (let i = 1; i <= daysInMonth; i++) {
          daysArray.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
      }
      return daysArray;
  }, [currentDate]);

  const getStatusColor = (status: OrderStatus) => {
    switch(status) {
        case 'COMPLETED': return 'bg-green-500';
        case 'IN_PROGRESS': return 'bg-blue-500';
        case 'PENDING': return 'bg-yellow-500';
        case 'CANCELED': return 'bg-red-500';
        default: return 'bg-gray-300';
    }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md p-5 rounded-[2rem] shadow-soft border border-white/50 sticky top-0 z-20">
         <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-brand-text tracking-tight">Agenda</h2>
            <div className="flex items-center gap-4">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronLeft size={20}/></button>
                <div className="text-center">
                    <span className="block text-sm font-black text-brand-text uppercase tracking-wide">
                        {currentDate.toLocaleString('pt-AO', { month: 'long' })}
                    </span>
                    <span className="text-xs text-brand-muted font-bold">{currentDate.getFullYear()}</span>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronRight size={20}/></button>
            </div>
         </div>
      </header>

      {/* Calendar Grid */}
      <AnimatedItem index={0}>
        <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] p-6 shadow-soft border border-white/50">
            {/* Week Days */}
            <div className="grid grid-cols-7 mb-4">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-brand-muted uppercase tracking-wider">{d}</div>
                ))}
            </div>
            
            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                {days.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />;
                    
                    const dateKey = formatDateKey(day);
                    const hasOrders = ordersByDate[dateKey];
                    const isSelected = selectedDateKey === dateKey;
                    const isToday = formatDateKey(new Date()) === dateKey;

                    return (
                        <button
                            key={i}
                            onClick={() => setSelectedDate(day)}
                            className={`
                                relative flex flex-col items-center justify-center h-10 w-full rounded-xl transition-all
                                ${isSelected ? 'bg-brand-yellow text-[#211D49] shadow-md scale-110 z-10' : 'hover:bg-gray-50 text-brand-text'}
                                ${isToday && !isSelected ? 'border border-brand-yellow text-brand-text' : ''}
                            `}
                        >
                            <span className={`text-sm font-bold ${isSelected ? 'font-black' : ''}`}>{day.getDate()}</span>
                            
                            {/* Status Dots */}
                            {hasOrders && (
                                <div className="flex gap-0.5 mt-1">
                                    {hasOrders.slice(0, 3).map((o, idx) => (
                                        <div key={idx} className={`w-1 h-1 rounded-full ${getStatusColor(o.status)}`}></div>
                                    ))}
                                    {hasOrders.length > 3 && <div className="w-1 h-1 rounded-full bg-gray-400"></div>}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
      </AnimatedItem>

      {/* Selected Day Details */}
      <div className="space-y-4 pb-10">
          <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-brand-text text-lg">
                  {selectedDate.getDate()} de {selectedDate.toLocaleString('pt-AO', { month: 'long' })}
              </h3>
              <span className="text-xs font-bold text-brand-muted bg-gray-100 px-3 py-1 rounded-full">
                  {selectedDayOrders.length} serviços
              </span>
          </div>

          {selectedDayOrders.length === 0 ? (
              <div className="text-center py-12 opacity-50 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 mx-2">
                  <Clock size={48} className="mx-auto mb-3 text-brand-muted stroke-1"/>
                  <p className="text-brand-muted font-bold text-sm">Sem agendamentos para este dia.</p>
              </div>
          ) : (
              <div className="space-y-3">
                  {selectedDayOrders.map((order, idx) => (
                      <AnimatedItem key={order.id} index={idx + 1}>
                          <div className="bg-white/80 backdrop-blur-md p-5 rounded-[2rem] shadow-sm border border-transparent hover:border-yellow-200 transition-all group">
                              <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm ${getStatusColor(order.status)}`}>
                                          {order.status === 'COMPLETED' ? <CheckCircle size={18}/> : 
                                           order.status === 'IN_PROGRESS' ? <Clock size={18} className="animate-spin-slow"/> : 
                                           order.status === 'CANCELED' ? <AlertCircle size={18}/> : 
                                           <Circle size={18}/>}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-brand-text text-base leading-tight">{order.clientName}</h4>
                                          <p className="text-[10px] text-brand-muted font-bold uppercase">{order.status === 'IN_PROGRESS' ? 'Em Execução' : order.status === 'PENDING' ? 'Pendente' : order.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}</p>
                                      </div>
                                  </div>
                                  <span className="font-black text-brand-text text-sm">{formatMoney(order.price)}</span>
                              </div>
                              
                              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                                  <p className="text-xs text-brand-muted font-medium line-clamp-2">{order.serviceDetails}</p>
                              </div>

                              <div className="flex items-center gap-4 text-xs font-bold text-brand-text">
                                  <div className="flex items-center gap-1.5 text-brand-muted">
                                      <Clock size={14} className="text-brand-yellow"/>
                                      {/* Try to extract time from date string */}
                                      {order.date.includes('às') ? order.date.split('às')[1] : 'Hora não def.'}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-brand-muted flex-1 min-w-0">
                                      <MapPin size={14} className="text-brand-yellow shrink-0"/>
                                      <span className="truncate">{order.address}</span>
                                  </div>
                              </div>
                          </div>
                      </AnimatedItem>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};

export default Agenda;
