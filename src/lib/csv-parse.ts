/**
 * Minimal RFC-style CSV parser (quoted fields, escaped "", CRLF).
 * Sufficient for seller bulk upload spreadsheets.
 */
export function parseCsvToMatrix(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let i = 0;
  let inQ = false;
  while (i < input.length) {
    const c = input[i];
    if (inQ) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQ = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(cur);
      cur = "";
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(cur);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      cur = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  row.push(cur);
  if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  return rows;
}
