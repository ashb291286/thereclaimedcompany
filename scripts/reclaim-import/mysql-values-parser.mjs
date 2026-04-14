/**
 * Parse MySQL INSERT ... VALUES (...) tuples from a dump fragment.
 * Handles single-quoted strings with '' escapes (standard mysqldump).
 */

export function findInsertStatement(sql, tableName) {
  const needle = `INSERT INTO \`${tableName}\` VALUES `;
  const idx = sql.indexOf(needle);
  if (idx === -1) return null;
  const valueStart = idx + needle.length;
  return { start: valueStart, base: idx };
}

/** Returns array of raw "(...)" tuple strings including parentheses */
export function parseValueTuples(sql, valueStart) {
  const tuples = [];
  let i = valueStart;
  const len = sql.length;
  while (i < len && /\s/.test(sql[i])) i++;
  while (i < len) {
    if (sql[i] !== "(") break;
    const [tuple, next] = consumeTuple(sql, i);
    tuples.push(tuple);
    i = next;
    while (i < len && /\s/.test(sql[i])) i++;
    if (sql[i] === ",") {
      i++;
      continue;
    }
    if (sql[i] === ";" || sql[i] === undefined) break;
    break;
  }
  return tuples;
}

function consumeTuple(sql, start) {
  if (sql[start] !== "(") throw new Error("Expected ( at " + start);
  let i = start;
  let depth = 0;
  let inStr = false;
  while (i < sql.length) {
    const c = sql[i];
    if (inStr) {
      if (c === "\\" && i + 1 < sql.length) {
        i += 2;
        continue;
      }
      if (c === "'" && sql[i + 1] === "'") {
        i += 2;
        continue;
      }
      if (c === "'") {
        inStr = false;
        i++;
        continue;
      }
      i++;
      continue;
    }
    if (c === "'") {
      inStr = true;
      i++;
      continue;
    }
    if (c === "(") {
      depth++;
      i++;
      continue;
    }
    if (c === ")") {
      depth--;
      i++;
      if (depth === 0) return [sql.slice(start, i), i];
      continue;
    }
    i++;
  }
  throw new Error("Unclosed tuple");
}

/** Split top-level comma-separated values inside "(...)" */
export function splitTupleValues(tupleWithParens) {
  const inner = tupleWithParens.slice(1, -1);
  const parts = [];
  let cur = "";
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      if (c === "\\" && i + 1 < inner.length) {
        cur += c + inner[i + 1];
        i++;
        continue;
      }
      cur += c;
      if (c === "'" && inner[i + 1] === "'") {
        cur += inner[i + 1];
        i++;
        continue;
      }
      if (c === "'") inStr = false;
      continue;
    }
    if (c === "'") {
      inStr = true;
      cur += c;
      continue;
    }
    if (c === "(") {
      depth++;
      cur += c;
      continue;
    }
    if (c === ")") {
      depth--;
      cur += c;
      continue;
    }
    if (c === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.map(parseSqlAtom);
}

function parseSqlAtom(raw) {
  if (raw === "NULL") return null;
  if (raw.startsWith("'")) {
    if (!raw.endsWith("'")) return raw;
    const body = raw
      .slice(1, -1)
      .replace(/''/g, "'")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\")
      .replace(/\\'/g, "'");
    return body;
  }
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(raw)) {
    return raw.includes(".") || /[eE]/.test(raw) ? parseFloat(raw) : parseInt(raw, 10);
  }
  return raw;
}
