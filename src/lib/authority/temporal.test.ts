import { describe, expect, it } from "vitest";
import { classifyDistance, isActiveOn, toDateOnly } from "./temporal";

describe("temporal validity", () => {
  it("treats a 2025-ending contract as inactive in 2026", () => {
    expect(isActiveOn("2024-01-01", "2025-12-31", "2026-01-15")).toBe(false);
  });

  it("treats the requested date as inside an inclusive interval", () => {
    expect(isActiveOn("2025-04-01", "2027-03-31", "2026-08-29")).toBe(true);
    expect(isActiveOn("2025-04-01", "2027-03-31", "2025-04-01")).toBe(true);
    expect(isActiveOn("2025-04-01", "2027-03-31", "2027-03-31")).toBe(true);
  });

  it("does not treat missing bounds as active", () => {
    expect(isActiveOn(null, "2027-03-31", "2026-01-01")).toBe(false);
    expect(isActiveOn("2025-04-01", null, "2026-01-01")).toBe(false);
  });

  it("normalises ISO timestamps to a date-only key", () => {
    expect(toDateOnly("2026-08-29T18:46:00.000Z")).toBe("2026-08-29");
  });

  it("classifies exact vs nearby vs no match", () => {
    expect(classifyDistance(8, 50, 250)).toBe("EXACT_MATCH");
    expect(classifyDistance(120, 50, 250)).toBe("NEARBY_MATCH");
    expect(classifyDistance(400, 50, 250)).toBe("NO_MATCH");
  });
});
