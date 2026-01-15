
export enum ItemCategory {
  SOFA = 'Sofás',
  CHAIR = 'Cadeiras/Poltronas',
  MATTRESS = 'Colchões',
  CURTAIN = 'Cortinas',
  RUG = 'Tapetes',
  VEHICLE = 'Viaturas',
  FILM = 'Películas',
  OTHER = 'Outros'
}

export interface PriceTableItem {
  id: string;
  category: string; // Changed from enum to string to allow custom categories
  label: string;
  price: number;
}

export interface CalculationParams {
  category: string;
  selectedOptionId: string;
  quantity: number;
  distanceKm: number;
}

export interface QuoteResult {
  itemName: string;
  unitPrice: number;
  totalPrice: number;
  estimatedCost: number;
  estimatedProfit: number;
  profitMargin: number;
}

export type TransactionType = 'ENTRY' | 'EXIT';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  category: string;
}

export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

export interface ServicePhotos {
  before?: string; // Base64 string
  after?: string;  // Base64 string
}

export interface ServiceOrder {
  id: string;
  clientName: string;
  serviceDetails: string;
  price: number;
  status: OrderStatus;
  date: string;
  address: string;
  phone: string;
  photos?: ServicePhotos;
  notes?: string;
  quoteRef?: string; // Referência ao número do Orçamento (MP 2026/0101)
}

export interface FinancialSummary {
  revenue: number;
  expenses: number;
  netProfit: number;
  realProfit: number;
}

export interface PDFSettings {
  logoX: number;
  logoY: number;
  logoWidth: number;
  logoHeight: number;
}

export interface DocCounters {
  quoteSequence: number;
  invoiceSequence: number;
  lastMonth: string; // To detect month changes
}
