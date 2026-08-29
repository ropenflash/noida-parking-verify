import type { AuthorityEntityKind, ExtractedProposal, ProposedPayload } from "@/lib/authority/types";

const HEADER_ALIASES: Record<string, keyof ProposedPayload> = {
  name: "name",
  site: "name",
  parking: "name",
  parking_name: "name",
  sitename: "name",
  sector: "sector",
  address: "address",
  landmark: "landmark",
  latitude: "latitude",
  lat: "latitude",
  longitude: "longitude",
  lng: "longitude",
  lon: "longitude",
  parking_type: "parkingType",
  type: "parkingType",
  cluster: "cluster",
  work_circle: "workCircle",
  workcircle: "workCircle",
  tender: "tenderNumber",
  tender_number: "tenderNumber",
  tendernumber: "tenderNumber",
  contract: "contractNumber",
  contract_number: "contractNumber",
  contractnumber: "contractNumber",
  contractor: "contractorName",
  contractor_name: "contractorName",
  rate: "approvedRate",
  approved_rate: "approvedRate",
  amount: "approvedRate",
  unit: "rateUnit",
  vehicle: "vehicleType",
  vehicle_type: "vehicleType",
  effective_from: "effectiveFrom",
  start: "effectiveFrom",
  start_date: "effectiveFrom",
  effective_until: "effectiveUntil",
  end: "effectiveUntil",
  end_date: "effectiveUntil",
  notes: "notes",
};

function normHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function asText(value: unknown): string | undefined {
  const t = String(value ?? "").trim();
  return t ? t : undefined;
}

function asDate(value: unknown): string | null | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const t = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const parsed = Date.parse(t);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString().slice(0, 10);
}

export function rowToPayload(row: Record<string, unknown>): ProposedPayload {
  const payload: ProposedPayload = {};
  for (const [key, value] of Object.entries(row)) {
    const field = HEADER_ALIASES[normHeader(key)];
    if (!field) continue;
    if (field === "latitude" || field === "longitude" || field === "approvedRate") {
      payload[field] = asNumber(value);
    } else if (field === "effectiveFrom" || field === "effectiveUntil") {
      payload[field] = asDate(value) ?? null;
    } else {
      payload[field] = asText(value) as never;
    }
  }
  return payload;
}

function inferKinds(payload: ProposedPayload): AuthorityEntityKind[] {
  const kinds: AuthorityEntityKind[] = [];
  if (payload.tenderNumber) kinds.push("TENDER");
  if (payload.contractorName) kinds.push("CONTRACTOR");
  if (payload.name || payload.sector || payload.latitude != null) kinds.push("SITE");
  if (payload.contractNumber || payload.approvedRate != null) kinds.push("CONTRACT");
  if (payload.approvedRate != null) kinds.push("RATE");
  return kinds.length ? kinds : ["SITE"];
}

export function proposalsFromRows(rows: Record<string, unknown>[]): ExtractedProposal[] {
  const out: ExtractedProposal[] = [];
  for (const row of rows) {
    const payload = rowToPayload(row);
    if (Object.keys(payload).length === 0) continue;
    for (const entityKind of inferKinds(payload)) {
      out.push({
        entityKind,
        payload,
        confidenceScore: entityKind === "SITE" && payload.latitude != null ? 70 : 55,
      });
    }
  }
  return out;
}

export function parseSpreadsheetBuffer(buffer: ArrayBuffer | Buffer): ExtractedProposal[] {
  // Lazy require keeps this file testable if xlsx is mocked.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx") as typeof import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return proposalsFromRows(rows);
}

export function proposalsFromPdfText(text: string): ExtractedProposal[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const joined = lines.join("\n");
  const payload: ProposedPayload = { rawText: joined.slice(0, 8000) };

  const sector = joined.match(/sector\s*[-:]?\s*(\d{1,3})/i);
  if (sector) payload.sector = sector[1];
  const tender = joined.match(/tender\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9/._-]{4,})/i);
  if (tender) payload.tenderNumber = tender[1];
  const contract = joined.match(/contract\s*(?:no\.?|number)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9/._-]{4,})/i);
  if (contract) payload.contractNumber = contract[1];
  const rate = joined.match(/(?:rs\.?|₹)\s*(\d{1,5}(?:\.\d{1,2})?)/i);
  if (rate) payload.approvedRate = Number(rate[1]);
  const nameLine = lines.find((l) => /parking/i.test(l) && l.length < 120);
  if (nameLine) payload.name = nameLine;

  const kinds = inferKinds(payload);
  return kinds.map((entityKind) => ({
    entityKind,
    payload,
    confidenceScore: 35,
  }));
}

export async function parsePdfBuffer(buffer: ArrayBuffer | Uint8Array): Promise<ExtractedProposal[]> {
  const { extractText } = await import("unpdf");
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const result = await extractText(bytes);
  const text = Array.isArray(result.text) ? result.text.join("\n") : String(result.text ?? "");
  if (!text.trim()) {
    return [
      {
        entityKind: "SITE",
        payload: { notes: "No extractable text. Enter fields manually from the document." },
        confidenceScore: 10,
      },
    ];
  }
  return proposalsFromPdfText(text);
}
