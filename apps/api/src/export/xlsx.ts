import ExcelJS from "exceljs";

type ExportRecord = Record<string, unknown>;

export async function toXlsx(records: ExportRecord[], worksheetName = "Export"): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PocketBase API Export";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sanitizeWorksheetName(worksheetName), {
    views: [{ state: "frozen", ySplit: 1 }]
  });

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

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(Math.max(header.length + 4, 14), 48)
  }));

  for (const record of records) {
    worksheet.addRow(
      Object.fromEntries(headers.map((header) => [header, normalizeCellValue(record[header])]))
    );
  }

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: Math.max(headers.length, 1) }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function normalizeCellValue(value: unknown): string | number | boolean | Date | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return JSON.stringify(value);
}

function sanitizeWorksheetName(value: string): string {
  const sanitized = value.replaceAll(/[\\/*?:[\]]/g, " ").trim();
  return (sanitized || "Export").slice(0, 31);
}
