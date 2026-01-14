
import React, { useState } from 'react';
import { LayoutDashboard, Calculator as CalcIcon, Wallet, FileText, List, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import Calculator from './components/Calculator';
import Dashboard from './components/Dashboard';
import Financials from './components/Financials';
import ServiceOrders from './components/ServiceOrders';
import ServicesManager from './components/ServicesManager';
import { useTheme } from './context/ThemeContext';
import { useData } from './context/DataContext';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calculator' | 'financial' | 'orders' | 'services'>('dashboard');
  const { theme } = useTheme();
  const { notification, hideNotification } = useData();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'orders': return <ServiceOrders />;
      case 'calculator': return <Calculator />;
      case 'financial': return <Financials />;
      case 'services': return <ServicesManager />;
      default: return <Dashboard />;
    }
  };

  return (
    // Use h-[100dvh] to fix mobile browser bar issues and overflow-hidden to prevent body scroll
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#F3F4F6] font-sans selection:bg-brand-yellow selection:text-brand-black relative">
      
      {/* GLOBAL NOTIFICATION TOAST */}
      {notification.visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`
                backdrop-blur-xl border shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl p-4 flex items-center gap-3 pr-12 relative overflow-hidden
                ${notification.type === 'success' ? 'bg-white/90 border-green-500/20' : 
                  notification.type === 'error' ? 'bg-white/90 border-red-500/20' : 
                  'bg-white/90 border-blue-500/20'}
            `}>
                {/* Status Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                     notification.type === 'success' ? 'bg-green-500' : 
                     notification.type === 'error' ? 'bg-red-500' : 
                     'bg-blue-500'
                }`}></div>

                <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${notification.type === 'success' ? 'bg-green-100 text-green-600' : 
                      notification.type === 'error' ? 'bg-red-100 text-red-600' : 
                      'bg-blue-100 text-blue-600'}
                `}>
                    {notification.type === 'success' && <CheckCircle size={20} strokeWidth={2.5}/>}
                    {notification.type === 'error' && <AlertCircle size={20} strokeWidth={2.5}/>}
                    {notification.type === 'info' && <Info size={20} strokeWidth={2.5}/>}
                </div>

                <div>
                    <h4 className="font-bold text-sm text-[#211D49]">
                        {notification.type === 'success' ? 'Sucesso!' : 
                         notification.type === 'error' ? 'Atenção' : 
                         'Informação'}
                    </h4>
                    <p className="text-xs font-medium text-gray-500 leading-snug">{notification.message}</p>
                </div>

                <button 
                    onClick={hideNotification}
                    className="absolute right-2 top-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
      )}

      {/* Content Area - Scrollable Container */}
      <main className="flex-1 overflow-y-auto w-full max-w-lg mx-auto relative scrollbar-hide overscroll-contain">
        <div className="p-6 pt-6 pb-32 min-h-full">
           {renderContent()}
        </div>
      </main>

      {/* Glassmorphism Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none h-24 bg-gradient-to-t from-[#F3F4F6] to-transparent">
         {/* Container: Floating Glass Bar */}
         <nav className="pointer-events-auto w-full max-w-lg mx-auto px-2 self-end mb-6">
            <div className="bg-white/90 backdrop-blur-md border border-white/60 shadow-[0_8px_32px_rgba(33,29,73,0.1)] rounded-[2.5rem] px-2 py-3 flex items-center justify-between relative transition-all will-change-transform">
                
                {/* Left Side Tabs (Dashboard & Orders) */}
                <div className="flex flex-1 justify-around gap-1">
                    <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 active:scale-95 ${
                        activeTab === 'dashboard' 
                        ? 'bg-yellow-50 text-yellow-600 border border-yellow-100 shadow-sm' 
                        : 'text-brand-muted hover:bg-gray-50'
                    }`}
                    title="Página Inicial"
                    >
                    <LayoutDashboard size={20} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
                    </button>

                    <button 
                    onClick={() => setActiveTab('orders')}
                    className={`flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 active:scale-95 ${
                        activeTab === 'orders' 
                        ? 'bg-yellow-50 text-yellow-600 border border-yellow-100 shadow-sm' 
                        : 'text-brand-muted hover:bg-gray-50'
                    }`}
                    title="Ordens de Serviço"
                    >
                    <FileText size={20} strokeWidth={activeTab === 'orders' ? 2.5 : 2} />
                    </button>
                </div>

                {/* Center Action Button (Calculator) - Glass Orb Design */}
                <div className="relative -top-8 mx-2 z-10 shrink-0">
                    <button 
                        onClick={() => setActiveTab('calculator')}
                        className={`
                            group relative
                            w-16 h-16 sm:w-20 sm:h-20 rounded-full 
                            flex items-center justify-center 
                            transition-all duration-300 
                            ${activeTab === 'calculator' ? '-translate-y-1 scale-105' : 'hover:scale-105'}
                        `}
                        title="Simulador"
                    >
                        {/* Outer Glass Ring */}
                        <div className="absolute inset-0 rounded-full bg-white/40 backdrop-blur-sm border border-white/60 shadow-lg"></div>
                        
                        {/* Inner Gradient Button */}
                        <div className={`
                            absolute inset-1.5 rounded-full 
                            flex items-center justify-center
                            shadow-[0_15px_30px_rgba(243,164,33,0.3)]
                            bg-gradient-to-br from-yellow-400 via-brand-yellow to-yellow-500
                            text-[#211D49]
                            transition-all duration-300
                        `}>
                            {/* Inner Shine Effect */}
                            <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-full blur-[2px]"></div>
                            
                            <CalcIcon 
                                size={28} 
                                strokeWidth={2.5} 
                                className="relative z-10 drop-shadow-sm transition-transform duration-300 group-hover:rotate-12 sm:w-8 sm:h-8"
                            />
                        </div>
                    </button>
                </div>

                {/* Right Side Tabs (Financial & Services) */}
                <div className="flex flex-1 justify-around gap-1">
                    <button 
                    onClick={() => setActiveTab('financial')}
                    className={`flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 active:scale-95 ${
                        activeTab === 'financial' 
                        ? 'bg-yellow-50 text-yellow-600 border border-yellow-100 shadow-sm' 
                        : 'text-brand-muted hover:bg-gray-50'
                    }`}
                    title="Financeiro"
                    >
                    <Wallet size={20} strokeWidth={activeTab === 'financial' ? 2.5 : 2} />
                    </button>

                    <button 
                    onClick={() => setActiveTab('services')}
                    className={`flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 active:scale-95 ${
                        activeTab === 'services' 
                        ? 'bg-yellow-50 text-yellow-600 border border-yellow-100 shadow-sm' 
                        : 'text-brand-muted hover:bg-gray-50'
                    }`}
                    title="Gerir Serviços"
                    >
                    <List size={20} strokeWidth={activeTab === 'services' ? 2.5 : 2} />
                    </button>
                </div>
            </div>
         </nav>
      </div>
    </div>
  );
};

export default App;
