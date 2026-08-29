import { describe, expect, it } from "vitest";
import { isPersonalUpi } from "@/lib/verification/engine";

describe("access and language invariants", () => {
  it("12. personal UPI never maps to an illegal label in the engine", () => {
    expect(
      isPersonalUpi({
        paymentMode: "UPI",
        upiRecipientName: "Arvind Yadav",
      }),
    ).toBe(true);
  });

  it("does not treat a personal name as an organisation", () => {
    expect(
      isPersonalUpi({
        paymentMode: "UPI",
        upiRecipientName: "Noida Auth Parking 142",
      }),
    ).toBe(false);
  });
});
