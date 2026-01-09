
import { ShowroomData } from './types';

export const SERVICE_CENTERS_LIST = [
  '粤桂琼', '鲁吉辽', '云贵川', '湘鄂赣', '豫皖', '苏沪', '浙闽', '京津冀', '陕甘宁'
];

export const GROUPS = ['中升集团', '广汇汽车', '永达汽车', '庞大汽贸', '利信五洲'];

export const generateMockShowrooms = (count: number): ShowroomData[] => {
  return Array.from({ length: count }, (_, i) => {
    const newCarSales = Math.floor(Math.random() * 100) + 50;
    const tradeInVol = Math.floor(newCarSales * (Math.random() * 0.1 + 0.15)); // ~18% penetration
    const brandTradeInVol = Math.floor(newCarSales * (Math.random() * 0.02 + 0.01));
    const inventoryInVol = Math.floor(tradeInVol * (Math.random() * 0.2 + 0.3));
    
    const auctionedVol = Math.floor(tradeInVol * (Math.random() * 0.2 + 0.2));
    const certifiedVol = Math.floor(Math.random() * 12) + 2;

    return {
      id: `SH-${String(i + 1).padStart(3, '0')}`,
      name: `二手车展厅 ${i + 1}`,
      serviceCenter: SERVICE_CENTERS_LIST[Math.floor(Math.random() * SERVICE_CENTERS_LIST.length)],
      dealerGroup: GROUPS[Math.floor(Math.random() * GROUPS.length)],
      replacement: {
        newCarSales,
        tradeInVol,
        brandTradeInVol,
        inventoryInVol,
        submissionVol: tradeInVol,
        submissionAttempts: Math.floor(tradeInVol * (1 + Math.random() * 0.1)),
        timelyPaymentVol: Math.floor(tradeInVol * (Math.random() * 0.05 + 0.93)),
        complaints: Math.floor(Math.random() * 3),
      },
      auction: {
        auctionedVol,
        successfulAuctionVol: Math.floor(auctionedVol * (Math.random() * 0.2 + 0.4)),
        purchaseAcquiredVol: Math.floor(tradeInVol * (Math.random() * 0.1 + 0.2)),
        fusionAuctionStores: Math.random() > 0.45 ? 1 : 0,
        totalServiceStores: 1,
      },
      retail: {
        certifiedVol,
        brandReplacementCertifiedVol: Math.floor(certifiedVol * 0.3),
        potentialSourceVol: Math.floor(certifiedVol * 10),
        liveLeads: Math.floor(Math.random() * 200) + 200,
        staffCount: Math.floor(Math.random() * 5) + 3,
        unitMargin: Math.floor(Math.random() * 4000) + 6000,
        inventoryCycle: Math.floor(Math.random() * 20) + 20,
      },
      customerSatisfaction: parseFloat((Math.random() * 1 + 4).toFixed(1)),
    };
  });
};

export const MOCK_SHOWROOMS = generateMockShowrooms(107);

export const WEIGHTS = {
  REPLACEMENT: 0.4,
  AUCTION: 0.3,
  RETAIL: 0.3
};

export const BENCHMARKS = {
  tradeInPenetration: 0.18,
  brandTradeInPenetration: 0.02,
  disposalRate: 0.4,
  passRate: 0.95,
  paymentRate: 0.95,
  complaintRate: 0.03,
  auctionRate: 0.3,
  auctionSuccessRate: 0.5,
  acquisitionRate: 0.25,
  fusionUsage: 0.55,
  retailOutreach: 0.95,
  extractionRate: 0.1,
  showroomCertifiedVol: 10,
  showroomLiveLeads: 300,
  showroomMargin: 8000,
  showroomCycle: 30,
  showroomEfficiency: 50000,
};