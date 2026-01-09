
export enum UserRole {
  OEM_SPECIALIST = 'OEM_SPECIALIST',
  CENTER_SPECIALIST = 'CENTER_SPECIALIST',
  GROUP_SPECIALIST = 'GROUP_SPECIALIST',
  SHOWROOM_SPECIALIST = 'SHOWROOM_SPECIALIST'
}

export interface ReplacementMetrics {
  newCarSales: number;
  tradeInVol: number;
  brandTradeInVol: number;
  inventoryInVol: number;
  submissionVol: number;
  submissionAttempts: number;
  timelyPaymentVol: number;
  complaints: number;
}

export interface AuctionMetrics {
  auctionedVol: number;
  successfulAuctionVol: number;
  purchaseAcquiredVol: number;
  fusionAuctionStores: number;
  totalServiceStores: number;
}

export interface RetailMetrics {
  certifiedVol: number;
  brandReplacementCertifiedVol: number;
  potentialSourceVol: number;
  liveLeads: number;
  staffCount: number;
  unitMargin: number;
  inventoryCycle: number;
}

export interface ShowroomData {
  id: string;
  name: string;
  serviceCenter: string;
  dealerGroup: string;
  replacement: ReplacementMetrics;
  auction: AuctionMetrics;
  retail: RetailMetrics;
  customerSatisfaction: number;
}

export interface HealthScoreBreakdown {
  replacementScore: number;
  auctionScore: number;
  retailScore: number;
  overallScore: number;
}

export interface BusinessHealth {
  score: number;
  status: 'excellent' | 'good' | 'average' | 'critical';
  breakdown: HealthScoreBreakdown;
  moduleAnalysis: {
    replacement: string;
    auction: string;
    retail: string;
  };
  weaknesses: string[];
  suggestions: string[];
  logicCheck: string;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  showroomId?: string;
  serviceCenter?: string;
  dealerGroup?: string;
}
