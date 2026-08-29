import { describe, expect, it } from "vitest";
import {
  calculateVerification,
  haversineMeters,
  isPersonalUpi,
  matchContractor,
} from "./engine";
import type { MatchedSite, VerificationInput } from "@/lib/types";

const advant: MatchedSite = {
  id: "site-advant",
  name: "Noida Authority Parking near Advant Building, Sector-142",
  sector: "142",
  address: "Near Advant Navis",
  latitude: 28.50002,
  longitude: 77.41088,
  officialStatus: "AUTHORISED",
  isDemo: true,
  distanceMeters: 8,
  approvedRate: 20,
  rateUnit: "per visit",
  contract: {
    id: "contract-active",
    contractNumber: "DEMO/NA/142/2025/01",
    status: "ACTIVE",
    startDate: "2025-04-01",
    endDate: "2027-03-31",
    approvedRate: 20,
  },
  contractor: {
    id: "contractor-1",
    legalName: "Demo Authorised Parking Services Pvt Ltd",
    displayName: "Demo Authorised Parking",
    verificationStatus: "VERIFIED",
  },
};

function baseInput(over: Partial<VerificationInput> = {}): VerificationInput {
  return {
    location: { sector: "142", latitude: 28.50002, longitude: 77.41088 },
    operator: {},
    payment: {},
    receipt: {},
    nearbySites: [],
    ...over,
  };
}

describe("haversineMeters", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineMeters(28.5, 77.41, 28.5, 77.41)).toBeLessThan(1);
  });
});

describe("verification engine", () => {
  it("1. exact authorised parking match scores location +30", () => {
    const result = calculateVerification(
      baseInput({ nearbySites: [{ ...advant, distanceMeters: 8 }] }),
    );
    expect(result.locationScore).toBe(30);
    expect(result.sectionStatuses.location).toBe("VERIFIED");
  });

  it("2. nearby but not exact parking match scores location +15", () => {
    const result = calculateVerification(
      baseInput({ nearbySites: [{ ...advant, distanceMeters: 120 }] }),
    );
    expect(result.locationScore).toBe(15);
    expect(result.sectionStatuses.location).toBe("UNCERTAIN");
    expect(result.explanation.some((e) => e.code === "LOCATION_NEARBY")).toBe(
      true,
    );
  });

  it("3. no authority match scores location 0", () => {
    const result = calculateVerification(baseInput({ nearbySites: [] }));
    expect(result.locationScore).toBe(0);
    expect(result.explanation.some((e) => e.code === "LOCATION_NO_MATCH")).toBe(
      true,
    );
  });

  it("4. active contractor scores contract +25", () => {
    const result = calculateVerification(
      baseInput({ nearbySites: [{ ...advant, distanceMeters: 8 }] }),
    );
    expect(result.contractScore).toBe(25);
  });

  it("5. expired contractor scores contract +10", () => {
    const result = calculateVerification(
      baseInput({
        nearbySites: [
          {
            ...advant,
            distanceMeters: 8,
            contract: { ...advant.contract!, status: "EXPIRED" },
          },
        ],
      }),
    );
    expect(result.contractScore).toBe(10);
  });

  it("6. personal UPI is not classified as unauthorised", () => {
    expect(
      isPersonalUpi({
        paymentMode: "UPI",
        upiRecipientName: "Arvind Yadav",
        upiId: "arvind@upi",
      }),
    ).toBe(true);

    const result = calculateVerification(
      baseInput({
        nearbySites: [{ ...advant, distanceMeters: 40, contract: undefined, contractor: undefined, approvedRate: 20 }],
        operator: { attendantName: "Arvind Yadav" },
        payment: {
          amount: 10,
          paymentMode: "UPI",
          upiRecipientName: "Arvind Yadav",
          upiId: "arvind@upi",
        },
      }),
    );

    expect(result.personalUpi).toBe(true);
    expect(result.classification).toBe("NEEDS_VERIFICATION");
    expect(result.classification).not.toBe("POTENTIALLY_UNAUTHORISED");
    expect(
      result.explanation.some((e) => e.code === "PAYMENT_PERSONAL_UPI"),
    ).toBe(true);
    expect(
      result.explanation.some((e) =>
        e.detail.toLowerCase().includes("does not by itself prove"),
      ),
    ).toBe(true);
  });

  it("7. official-style receipt scores receipt +10", () => {
    const result = calculateVerification(
      baseInput({
        nearbySites: [{ ...advant, distanceMeters: 8 }],
        operator: { operatorName: "Demo Authorised Parking Services Pvt Ltd" },
        payment: { amount: 20, paymentMode: "UPI", upiRecipientName: "Noida Auth Parking 142" },
        receipt: {
          parkingNumber: "Noida Auth Parking 142",
          spotNumber: "00102",
          deviceNumber: "842129340",
          issuerName: "Noida Auth Parking 142",
          amount: 20,
          hasImage: true,
        },
      }),
    );
    expect(result.receiptScore).toBe(10);
    expect(result.classification).toBe("VERIFIED_LEGAL");
  });

  it("8. missing receipt does not add receipt points", () => {
    const result = calculateVerification(
      baseInput({
        nearbySites: [{ ...advant, distanceMeters: 8 }],
        receipt: {},
      }),
    );
    expect(result.receiptScore).toBe(0);
    expect(result.explanation.some((e) => e.code === "RECEIPT_MISSING")).toBe(
      true,
    );
  });

  it("9. correct rate at exact match scores +15", () => {
    const result = calculateVerification(
      baseInput({
        nearbySites: [{ ...advant, distanceMeters: 8 }],
        payment: { amount: 20, paymentMode: "CASH" },
      }),
    );
    expect(result.rateScore).toBe(15);
    expect(result.isOvercharging).toBe(false);
  });

  it("10. overcharging at exact match sets OVERCHARGING", () => {
    const result = calculateVerification(
      baseInput({
        nearbySites: [{ ...advant, distanceMeters: 8 }],
        payment: { amount: 50, paymentMode: "CASH" },
      }),
    );
    expect(result.rateScore).toBe(-20);
    expect(result.isOvercharging).toBe(true);
    expect(result.classification).toBe("OVERCHARGING");
  });

  it("11. personal UPI plus valid contractor does not treat UPI as unauthorised", () => {
    const result = calculateVerification(
      baseInput({
        nearbySites: [{ ...advant, distanceMeters: 8 }],
        operator: { operatorName: "Demo Authorised Parking", attendantName: "Arvind Yadav" },
        payment: {
          amount: 20,
          paymentMode: "UPI",
          upiRecipientName: "Arvind Yadav",
        },
      }),
    );
    expect(result.personalUpi).toBe(false);
    expect(result.classification).not.toBe("POTENTIALLY_UNAUTHORISED");
    expect(result.operatorScore).toBeGreaterThan(0);
  });

  it("does not apply nearby-site rate as proven overcharging", () => {
    const result = calculateVerification(
      baseInput({
        nearbySites: [{ ...advant, distanceMeters: 120 }],
        payment: { amount: 10, paymentMode: "UPI", upiRecipientName: "Arvind Yadav" },
      }),
    );
    expect(result.isOvercharging).toBe(false);
    expect(result.classification).toBe("NEEDS_VERIFICATION");
  });
});

describe("matchContractor", () => {
  it("matches overlapping legal names", () => {
    const match = matchContractor("Demo Authorised Parking", [
      advant.contractor!,
    ]);
    expect(match?.id).toBe("contractor-1");
  });
});
