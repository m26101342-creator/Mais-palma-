
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { PriceTableItem, Transaction, ServiceOrder, ItemCategory, DocCounters } from '../types';

// Initial Data
const getInitialServices = (): PriceTableItem[] => [
  { id: 'sofa_mono', category: ItemCategory.SOFA, label: 'Mono', price: 6000 },
  { id: 'sofa_2', category: ItemCategory.SOFA, label: 'Sofá de 2 Lugares', price: 10000 },
  { id: 'sofa_3', category: ItemCategory.SOFA, label: 'Sofá de 3 Lugares', price: 13000 },
  { id: 'sofa_4', category: ItemCategory.SOFA, label: 'Sofá de 4 Lugares', price: 16000 },
  { id: 'sofa_5', category: ItemCategory.SOFA, label: 'Sofá de 5 Lugares', price: 18000 },
  { id: 'sofa_6', category: ItemCategory.SOFA, label: 'Sofá de 6 ou + Lugares', price: 20000 },
  { id: 'chair_std', category: ItemCategory.CHAIR, label: 'Cadeira Simples', price: 3000 },
  { id: 'armchair', category: ItemCategory.CHAIR, label: 'Poltrona', price: 6000 },
  { id: 'mat_crib', category: ItemCategory.MATTRESS, label: 'Colchão de Berço', price: 6000 },
  { id: 'mat_single', category: ItemCategory.MATTRESS, label: 'Colchão Solteiro', price: 9000 },
  { id: 'mat_double', category: ItemCategory.MATTRESS, label: 'Colchão Casal', price: 11000 },
  { id: 'mat_king', category: ItemCategory.MATTRESS, label: 'Colchão King', price: 14000 },
  { id: 'curt_sm', category: ItemCategory.CURTAIN, label: 'Jogo Pequeno', price: 12000 },
  { id: 'curt_md', category: ItemCategory.CURTAIN, label: 'Jogo Médio', price: 14000 },
  { id: 'curt_lg', category: ItemCategory.CURTAIN, label: 'Jogo Grande', price: 16000 },
  { id: 'curt_dbl', category: ItemCategory.CURTAIN, label: 'Cortinas Duplas', price: 20000 },
  { id: 'rug_sm', category: ItemCategory.RUG, label: 'Tapete Pequeno', price: 10000 },
  { id: 'rug_md', category: ItemCategory.RUG, label: 'Tapete Médio', price: 14000 },
  { id: 'rug_lg', category: ItemCategory.RUG, label: 'Tapete Grande', price: 18000 },
  { id: 'car_sedan', category: ItemCategory.VEHICLE, label: 'Turismo', price: 22000 },
  { id: 'car_suv5', category: ItemCategory.VEHICLE, label: 'SUV 5 Lugares', price: 24000 },
  { id: 'car_suv7', category: ItemCategory.VEHICLE, label: 'SUV 7 Lugares', price: 26000 },
  { id: 'film_sedan', category: ItemCategory.FILM, label: 'Película Turismo', price: 40000 },
  { id: 'film_suv5', category: ItemCategory.FILM, label: 'Película SUV 5 Lug', price: 50000 },
  { id: 'film_suv7', category: ItemCategory.FILM, label: 'Película SUV 7 Lug', price: 60000 },
];

// DADOS ZERADOS - Fresh Install
const INITIAL_TRANSACTIONS: Transaction[] = [];
const INITIAL_ORDERS: ServiceOrder[] = [];

// Combine ItemCategory with some financial defaults
const INITIAL_CATEGORIES = [
    ...Object.values(ItemCategory),
    'Material',
    'Transporte',
    'Alimentação',
    'Marketing',
    'Salários'
];

// Initial Counters
const INITIAL_COUNTERS: DocCounters = {
    quoteSequence: 0,
    invoiceSequence: 0,
    lastMonth: new Date().toISOString().slice(0, 7) // YYYY-MM
};

// Helper for LocalStorage
const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    console.warn(`Error loading ${key} from storage`, e);
    return fallback;
  }
};

export interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

interface DataContextType {
  services: PriceTableItem[];
  categories: string[];
  addService: (service: PriceTableItem) => void;
  updateService: (service: PriceTableItem) => void;
  removeService: (id: string) => void;
  resetServices: () => void;
  addCategory: (category: string) => void;
  
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;
  
  orders: ServiceOrder[];
  addOrder: (order: ServiceOrder) => void;
  updateOrder: (order: ServiceOrder) => void;
  removeOrder: (id: string) => void;
  updateOrderStatus: (id: string, status: ServiceOrder['status']) => void;
  
  pdfSettings: any;
  
  generateDocId: (type: 'QUOTE' | 'INVOICE') => string;

  // Notification System
  notification: NotificationState;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideNotification: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from LocalStorage or Fallback
  const [services, setServices] = useState<PriceTableItem[]>(() => 
    loadFromStorage('mp_services', getInitialServices())
  );
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    loadFromStorage('mp_transactions', INITIAL_TRANSACTIONS)
  );
  
  const [orders, setOrders] = useState<ServiceOrder[]>(() => 
    loadFromStorage('mp_orders', INITIAL_ORDERS)
  );
  
  const [categories, setCategories] = useState<string[]>(() => 
    loadFromStorage('mp_categories', Array.from(new Set(INITIAL_CATEGORIES)))
  );

  const [counters, setCounters] = useState<DocCounters>(() => 
    loadFromStorage('mp_doc_counters', INITIAL_COUNTERS)
  );

  const [notification, setNotification] = useState<NotificationState>({
    message: '',
    type: 'info',
    visible: false
  });

  // PDF Settings
  const pdfSettings = {
      logoX: 10,
      logoY: 10,
      logoWidth: 50,
      logoHeight: 35
  };

  // Persist Data Effects
  useEffect(() => { localStorage.setItem('mp_services', JSON.stringify(services)); }, [services]);
  useEffect(() => { localStorage.setItem('mp_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('mp_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('mp_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('mp_doc_counters', JSON.stringify(counters)); }, [counters]);


  const addCategory = (category: string) => {
      if (!category) return;
      setCategories(prev => {
          if (prev.includes(category)) return prev;
          return [...prev, category];
      });
  };

  const addService = (service: PriceTableItem) => {
    setServices([...services, service]);
    addCategory(service.category);
  };

  const updateService = (updatedService: PriceTableItem) => {
    setServices(services.map(s => s.id === updatedService.id ? updatedService : s));
    addCategory(updatedService.category);
  };

  const removeService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const resetServices = () => {
    setServices(getInitialServices());
  };

  const addTransaction = (transaction: Transaction) => {
    setTransactions([transaction, ...transactions]);
    addCategory(transaction.category);
  };

  const removeTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const addOrder = (order: ServiceOrder) => {
    setOrders([order, ...orders]);
  };

  const updateOrder = (updatedOrder: ServiceOrder) => {
    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const removeOrder = (id: string) => {
    setOrders(orders.filter(o => o.id !== id));
  };

  const updateOrderStatus = (id: string, status: ServiceOrder['status']) => {
    if (status === 'COMPLETED') {
        const order = orders.find(o => o.id === id);
        if (order && order.status !== 'COMPLETED') {
            const autoTransaction: Transaction = {
                id: `auto_${Date.now()}`,
                description: `${order.clientName} - ${order.serviceDetails}`,
                amount: order.price,
                type: 'ENTRY',
                category: 'Serviços',
                date: new Date().toISOString().split('T')[0]
            };
            setTransactions(prev => [autoTransaction, ...prev]);
        }
    }
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
  };

  // --- Document ID Logic ---
  const generateDocId = (type: 'QUOTE' | 'INVOICE'): string => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentMonthKey = now.toISOString().slice(0, 7); // YYYY-MM

      let nextSeq = 1;
      
      setCounters(prev => {
          // Reset logic if month changes? 
          // User requested: "01 será ou fará referência ao número do mês... segundo 01 seja contagem".
          // Assuming monthly reset for the sequence part to match MMNN format cleanly?
          // Or strictly sequential regardless of month? 
          // Usually "MP 2026/0101" implies Month 01, Sequence 01. 
          // If we are in Feb: "MP 2026/0201". 
          // Let's implement monthly reset for sequence to keep it '01' based on month.
          
          let newQuoteSeq = prev.quoteSequence;
          let newInvoiceSeq = prev.invoiceSequence;

          // Check if month changed, reset counters if desired. 
          // For simplicity and standard compliance, let's keep sequence continuous per month.
          if (prev.lastMonth !== currentMonthKey) {
             newQuoteSeq = 0;
             newInvoiceSeq = 0;
          }

          if (type === 'QUOTE') {
              newQuoteSeq += 1;
              nextSeq = newQuoteSeq;
          } else {
              newInvoiceSeq += 1;
              nextSeq = newInvoiceSeq;
          }

          return {
              quoteSequence: newQuoteSeq,
              invoiceSequence: newInvoiceSeq,
              lastMonth: currentMonthKey
          };
      });

      // Format: MP YYYY/MMNN
      const prefix = type === 'QUOTE' ? 'MP' : 'FR';
      const sequenceStr = String(nextSeq).padStart(2, '0'); // Ensures '01'
      
      return `${prefix} ${currentYear}/${currentMonth}${sequenceStr}`;
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setNotification({ message, type, visible: true });
      setTimeout(() => {
          setNotification(prev => ({ ...prev, visible: false }));
      }, 3000);
  };

  const hideNotification = () => {
      setNotification(prev => ({ ...prev, visible: false }));
  };

  return (
    <DataContext.Provider value={{ 
      services, categories, addService, updateService, removeService, resetServices, addCategory,
      transactions, addTransaction, removeTransaction, 
      orders, addOrder, updateOrder, removeOrder, updateOrderStatus,
      pdfSettings, generateDocId,
      notification, showNotification, hideNotification
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
