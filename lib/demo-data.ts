export type DemoTransaction = {
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: number;
  kind: "income" | "expense" | "saving";
};

export const demoSummary = {
  month: "Júní 2026",
  income: 742000,
  expenses: 468500,
  balance: 273500,
  transactionCount: 39
};

export const demoTrend = [
  { month: "jan.", income: 635000, expenses: 421000, savings: 70000 },
  { month: "feb.", income: 648000, expenses: 438000, savings: 75000 },
  { month: "mar.", income: 655000, expenses: 402000, savings: 85000 },
  { month: "apr.", income: 690000, expenses: 455000, savings: 80000 },
  { month: "maí", income: 680000, expenses: 512000, savings: 45000 },
  { month: "jún.", income: 742000, expenses: 468500, savings: 90000 }
];

export const demoCategories = [
  { name: "Matur", value: 138200 },
  { name: "Reikningar", value: 112400 },
  { name: "Heimili", value: 62500 },
  { name: "Samgöngur", value: 48600 },
  { name: "Annað", value: 48000 },
  { name: "Skemmtun", value: 36900 },
  { name: "Áskriftir", value: 21900 }
];

export const demoTransactions: DemoTransaction[] = [
  { id: "tx-1", merchant: "Laun", category: "Tekjur", date: "1. júní", amount: 742000, kind: "income" },
  { id: "tx-2", merchant: "Bónus", category: "Matur", date: "4. júní", amount: 18420, kind: "expense" },
  { id: "tx-3", merchant: "Húsfélag", category: "Reikningar", date: "6. júní", amount: 34900, kind: "expense" },
  { id: "tx-4", merchant: "N1", category: "Samgöngur", date: "9. júní", amount: 12980, kind: "expense" },
  { id: "tx-5", merchant: "Rafmagn", category: "Reikningar", date: "11. júní", amount: 14620, kind: "expense" },
  { id: "tx-6", merchant: "Netflix", category: "Áskriftir", date: "13. júní", amount: 2490, kind: "expense" },
  { id: "tx-7", merchant: "Varasjóður", category: "Sparnaður", date: "15. júní", amount: 90000, kind: "saving" },
  { id: "tx-8", merchant: "Apótek", category: "Heimili", date: "18. júní", amount: 6890, kind: "expense" }
];

export const demoBills = [
  { id: "bill-1", name: "Húsfélag", due: "5. júní", amount: 34900, paid: true },
  { id: "bill-2", name: "Rafmagn", due: "11. júní", amount: 14620, paid: true },
  { id: "bill-3", name: "Sími og internet", due: "15. júní", amount: 12900, paid: true },
  { id: "bill-4", name: "Tryggingar", due: "24. júní", amount: 18700, paid: false },
  { id: "bill-5", name: "Leiga á geymslu", due: "28. júní", amount: 31280, paid: false }
];

export const demoSavings = [
  { id: "saving-1", name: "Varasjóður", current: 420000, target: 600000, lastAdded: 50000 },
  { id: "saving-2", name: "Húsnæðissparnaður", current: 850000, target: 2000000, lastAdded: 40000 }
];
