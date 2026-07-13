/** Parse holiday CSV / TSV / pasted Google Sheet cells into name + date rows. */

export type ParsedHolidayRow = { name: string; date: string };

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseFlexibleDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : v;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const d = new Date(`${iso}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : iso;
  }

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  // simple CSV (handles quoted commas lightly)
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

export function parseHolidayImportText(text: string): {
  rows: ParsedHolidayRow[];
  errors: string[];
} {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { rows: [], errors: ["No rows found"] };

  const first = splitLine(lines[0]);
  const headers = first.map(normalizeHeader);
  const hasHeader =
    headers.includes("name") ||
    headers.includes("holiday") ||
    headers.includes("holidayname") ||
    headers.includes("date") ||
    headers.includes("holidaydate");

  let nameIdx = 0;
  let dateIdx = 1;
  let start = 0;

  if (hasHeader) {
    start = 1;
    const n = headers.findIndex((h) =>
      ["name", "holiday", "holidayname", "title"].includes(h)
    );
    const d = headers.findIndex((h) =>
      ["date", "holidaydate", "day"].includes(h)
    );
    nameIdx = n >= 0 ? n : 0;
    dateIdx = d >= 0 ? d : nameIdx === 0 ? 1 : 0;
  } else if (first.length >= 2) {
    // Heuristic: if first cell looks like a date, swap
    if (parseFlexibleDate(first[0]) && !parseFlexibleDate(first[1])) {
      dateIdx = 0;
      nameIdx = 1;
    }
  }

  const rows: ParsedHolidayRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (let i = start; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const name = (cells[nameIdx] || "").trim();
    const dateRaw = (cells[dateIdx] || "").trim();
    if (!name && !dateRaw) continue;
    const date = parseFlexibleDate(dateRaw);
    if (!name || !date) {
      errors.push(`Row ${i + 1}: need name and valid date (got "${lines[i]}")`);
      continue;
    }
    if (seen.has(date)) continue;
    seen.add(date);
    rows.push({ name, date });
  }

  return { rows, errors };
}

export async function fetchGoogleSheetCsv(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("Sheet URL is required");

  let csvUrl = trimmed;
  // Convert typical Google Sheets edit URLs to export CSV
  const editMatch = trimmed.match(
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
  );
  if (editMatch) {
    const id = editMatch[1];
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch?.[1] ?? "0";
    csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  }

  const res = await fetch(csvUrl, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(
      "Could not fetch sheet. Make sure it is shared as Anyone with the link (viewer)."
    );
  }
  return res.text();
}
