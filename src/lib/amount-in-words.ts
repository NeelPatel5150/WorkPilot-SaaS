/** Indian numbering: thousand / lakh / crore → "Indian Rupee … Only" */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ` ${ONES[o]}` : ""}`.trim();
}

function threeDigits(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = h ? `${ONES[h]} Hundred` : "";
  const tail = r ? twoDigits(r) : "";
  return [head, tail].filter(Boolean).join(" ");
}

function integerToWords(n: number): string {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 1_00_00_000);
  const lakh = Math.floor((n % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((n % 1_00_000) / 1000);
  const hundred = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** e.g. 14800 → "Indian Rupee Fourteen Thousand Eight Hundred Only" */
export function indianRupeeInWords(amount: number): string {
  const n = Math.max(0, Number(amount) || 0);
  const rupees = Math.floor(n + 1e-9);
  let paise = Math.round((n - rupees) * 100);
  if (paise === 100) {
    return indianRupeeInWords(rupees + 1);
  }

  let words = `Indian Rupee ${integerToWords(rupees)}`;
  if (paise > 0) {
    words += ` and ${twoDigits(paise)} Paise`;
  }
  return `${words} Only`;
}
