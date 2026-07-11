/** Deterministic mulberry32 PRNG so re-running the seed always produces the same shape of data. */
export function createRng(seed: number): () => number {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function hoursFromNow(hours: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + hours * MS_PER_HOUR);
}

export function daysFromNow(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + days * MS_PER_DAY);
}

export function hoursAgo(hours: number, now: Date = new Date()): Date {
  return hoursFromNow(-hours, now);
}

export function daysAgo(days: number, now: Date = new Date()): Date {
  return daysFromNow(-days, now);
}

export const IE_FIRST_NAMES = [
  "Aoife", "Ciaran", "Niamh", "Sean", "Roisin", "Cian", "Saoirse", "Eoin",
  "Orla", "Cormac", "Grainne", "Declan", "Sinead", "Padraig", "Maeve", "Fionn",
];

export const GB_FIRST_NAMES = [
  "Oliver", "Amelia", "George", "Isla", "Harry", "Freya", "Jack", "Poppy",
  "Charlie", "Ivy", "Thomas", "Ella", "Alfie", "Grace", "Archie", "Lily",
];

export const SURNAMES = [
  "Murphy", "Kelly", "O'Sullivan", "Walsh", "Byrne", "Ryan", "Doyle", "Mc-Carthy",
  "Smith", "Jones", "Taylor", "Brown", "Wilson", "Evans", "Clarke", "Hughes",
];

export const BUSINESS_NAMES = [
  "Liffey Trading Ltd", "Emerald Logistics DAC", "Shamrock Retail Group",
  "Thames Commerce PLC", "Albion Wholesale Ltd", "Northbridge Services Ltd",
  "Kildare Manufacturing Co", "Cotswold Supplies Ltd", "Dublin Bay Foods Ltd",
  "Chiltern Distribution PLC",
];

/** Synthetic, clearly-fake IBAN-style reference — no real checksum is claimed. */
export function makeCustomerRef(rng: () => number, country: "IE" | "GB", sequence: number): string {
  const bankCode = country === "IE" ? "AIBK" : "NWBK";
  const digits = String(100000000000 + sequence * 37 + Math.floor(rng() * 1000)).slice(0, 14);
  return `${country}${randomInt(rng, 10, 99)}${bankCode}${digits}`;
}

export function makeReference(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(6, "0")}`;
}
