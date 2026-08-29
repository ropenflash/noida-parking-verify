import { describe, expect, it } from "vitest";
import { proposalsFromPdfText, proposalsFromRows, rowToPayload } from "./extract";

describe("authority extraction", () => {
  it("maps spreadsheet headers into proposed site fields", () => {
    const payload = rowToPayload({
      Site: "Advant Navis parking",
      Sector: "142",
      Lat: "28.50002",
      Lng: "77.41088",
      Contractor: "Demo Authorised Parking Services Pvt Ltd",
      "Contract number": "NA/142/2025/01",
      Rate: "20",
      "Effective from": "2025-04-01",
      "Effective until": "2027-03-31",
    });
    expect(payload.name).toBe("Advant Navis parking");
    expect(payload.sector).toBe("142");
    expect(payload.latitude).toBeCloseTo(28.50002);
    expect(payload.approvedRate).toBe(20);
    expect(payload.contractNumber).toBe("NA/142/2025/01");
  });

  it("emits proposed records only — never a verified flag", () => {
    const rows = proposalsFromRows([
      { name: "Sector 18", sector: "18", rate: 10, contractor: "Acme" },
    ]);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.entityKind)).toBe(true);
    expect(JSON.stringify(rows)).not.toMatch(/VERIFIED/);
  });

  it("pulls tender and rate hints from PDF text as proposed data", () => {
    const text = `
      Noida Authority parking tender
      Tender No: NMA/PKT/142/2025
      Contract number: DEMO/NA/142/2025/01
      Sector 142
      Rate Rs. 20
    `;
    const rows = proposalsFromPdfText(text);
    expect(rows.some((r) => r.payload.tenderNumber?.includes("NMA"))).toBe(true);
    expect(rows.some((r) => r.payload.approvedRate === 20)).toBe(true);
    expect(rows.every((r) => r.confidenceScore < 80)).toBe(true);
  });
});
