type ExportRecord = Record<string, unknown>;

export function toCsv(records: ExportRecord[]): string {
  if (records.length === 0) {
    return "";
  }

  const headers = Array.from(
    records.reduce<Set<string>>((keys, record) => {
      for (const key of Object.keys(record)) {
        if (key !== "expand") {
          keys.add(key);
        }
      }

      return keys;
    }, new Set<string>())
  );

  return [
    headers.map(escapeCsvCell).join(","),
    ...records.map((record) => headers.map((header) => escapeCsvCell(record[header])).join(","))
  ].join("\n");
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = typeof value === "object" ? JSON.stringify(value) : String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
