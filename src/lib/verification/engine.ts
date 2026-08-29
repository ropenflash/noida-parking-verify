import type {
  Classification,
  ExplanationItem,
  MatchedContractor,
  MatchedSite,
  SectionStatus,
  VerificationConfig,
  VerificationInput,
  VerificationOutput,
} from "@/lib/types";

export const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = {
  scores: {
    locationExact: 30,
    locationNearby: 15,
    contractActive: 25,
    contractExpired: 10,
    operatorMatch: 20,
    attendantLinked: 10,
    rateMatch: 15,
    rateDiffers: -20,
    receiptOfficial: 10,
    receiptContractor: 5,
    paymentOfficial: 10,
    paymentContractor: 5,
    paymentPersonalUpi: 0,
  },
  thresholds: {
    exactMatchMeters: 50,
    nearbyMatchMeters: 250,
    verifiedMin: 80,
    likelyMin: 60,
    needsVerificationMin: 40,
    potentiallyUnauthorisedMin: 20,
  },
};

const AUTHORITY_HINTS = [
  "noida auth",
  "noida authority",
  "authority parking",
  "noida parking",
  "nma",
  "noida metro",
];

const ORG_HINTS = [
  "pvt",
  "ltd",
  "limited",
  "llp",
  "private",
  "contractor",
  "services",
  "parking",
];

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function normaliseName(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function looksLikeOrganisation(name: string | null | undefined): boolean {
  const n = normaliseName(name);
  if (!n) return false;
  return ORG_HINTS.some((hint) => n.includes(hint));
}

export function looksLikeAuthorityPayment(
  name: string | null | undefined,
  issuer?: string | null,
): boolean {
  const haystack = `${name ?? ""} ${issuer ?? ""}`.toLowerCase();
  return AUTHORITY_HINTS.some((hint) => haystack.includes(hint));
}

function namesOverlap(a: string, b: string): boolean {
  const left = new Set(normaliseName(a).split(" ").filter((w) => w.length > 2));
  const right = new Set(normaliseName(b).split(" ").filter((w) => w.length > 2));
  if (left.size === 0 || right.size === 0) return false;
  for (const word of left) {
    if (right.has(word)) return true;
  }
  return normaliseName(a).includes(normaliseName(b)) || normaliseName(b).includes(normaliseName(a));
}

export function matchParkingSite(
  nearbySites: MatchedSite[],
  exactMeters: number,
  nearbyMeters: number,
): MatchedSite | null {
  const ranked = [...nearbySites].sort(
    (a, b) => a.distanceMeters - b.distanceMeters,
  );
  const close = ranked.find((s) => s.distanceMeters <= nearbyMeters);
  if (!close) return null;
  return close.distanceMeters <= exactMeters || close.distanceMeters <= nearbyMeters
    ? close
    : null;
}

export function matchContractor(
  operatorName: string | null | undefined,
  contractors: MatchedContractor[],
): MatchedContractor | null {
  const needle = normaliseName(operatorName);
  if (!needle) return null;
  return (
    contractors.find((c) => {
      return (
        namesOverlap(needle, c.legalName) ||
        namesOverlap(needle, c.displayName ?? "")
      );
    }) ?? null
  );
}

function classifyFromScore(
  score: number,
  config: VerificationConfig,
  overcharging: boolean,
): Classification {
  if (overcharging) return "OVERCHARGING";
  if (score >= config.thresholds.verifiedMin) return "VERIFIED_LEGAL";
  if (score >= config.thresholds.likelyMin) return "LIKELY_LEGAL";
  if (score >= config.thresholds.needsVerificationMin) return "NEEDS_VERIFICATION";
  if (score >= config.thresholds.potentiallyUnauthorisedMin) {
    return "POTENTIALLY_UNAUTHORISED";
  }
  return "UNKNOWN";
}

function push(
  list: ExplanationItem[],
  item: ExplanationItem,
): void {
  list.push(item);
}

export function calculateVerification(
  input: VerificationInput,
  config: VerificationConfig = DEFAULT_VERIFICATION_CONFIG,
): VerificationOutput {
  const explanation: ExplanationItem[] = [];
  const nearby = [...input.nearbySites].sort(
    (a, b) => a.distanceMeters - b.distanceMeters,
  );
  const match = matchParkingSite(
    nearby,
    config.thresholds.exactMatchMeters,
    config.thresholds.nearbyMatchMeters,
  );

  let locationScore = 0;
  let locationStatus: SectionStatus = "UNAVAILABLE";
  const distanceMeters: number | null = match?.distanceMeters ?? null;

  if (match) {
    if (match.distanceMeters <= config.thresholds.exactMatchMeters) {
      locationScore = config.scores.locationExact;
      locationStatus = "VERIFIED";
      push(explanation, {
        code: "LOCATION_EXACT",
        title: "Close match to a known parking site",
        detail: `Evidence suggests a known site (${match.name}) approximately ${Math.round(match.distanceMeters)}m away. This is not a legal determination that this exact pin is authorised.`,
        tone: "positive",
      });
    } else {
      locationScore = config.scores.locationNearby;
      locationStatus = "UNCERTAIN";
      push(explanation, {
        code: "LOCATION_NEARBY",
        title: "Nearby known parking site",
        detail: `A known site (${match.name}) is approximately ${Math.round(match.distanceMeters)}m away. Nearby is not the same as an exact authorised location.`,
        tone: "neutral",
      });
    }
    if (match.isDemo) {
      push(explanation, {
        code: "DEMO_SITE",
        title: "Matched site is marked DEMO DATA",
        detail: "This authority record is demonstration data and must not be treated as a live official listing.",
        tone: "caution",
      });
    }
  } else if (
    input.location.latitude != null &&
    input.location.longitude != null
  ) {
    locationStatus = "UNAVAILABLE";
    push(explanation, {
      code: "LOCATION_NO_MATCH",
      title: "No matching official parking site",
      detail: "No sourced authority parking site was found near these coordinates. Absence of a record is not proof of unauthorised parking.",
      tone: "neutral",
    });
  } else {
    push(explanation, {
      code: "LOCATION_MISSING",
      title: "Coordinates not provided",
      detail: "Location was entered without coordinates, so a geo match against authority sites could not be made.",
      tone: "neutral",
    });
  }

  const exactLocation =
    Boolean(match) &&
    match!.distanceMeters <= config.thresholds.exactMatchMeters;

  const contract = match?.contract ?? null;
  let contractScore = 0;
  let authorityStatus: SectionStatus = match ? "UNCERTAIN" : "UNAVAILABLE";

  if (contract?.status === "ACTIVE") {
    contractScore = config.scores.contractActive;
    authorityStatus = exactLocation ? "VERIFIED" : "UNCERTAIN";
    push(explanation, {
      code: "CONTRACT_ACTIVE",
      title: "Active contract on file",
      detail: `An active demo/sourced contract (${contract.contractNumber ?? "unnumbered"}) is associated with the matched site.`,
      tone: "positive",
    });
  } else if (contract?.status === "EXPIRED") {
    contractScore = config.scores.contractExpired;
    authorityStatus = "UNCERTAIN";
    push(explanation, {
      code: "CONTRACT_EXPIRED",
      title: "Historical or expired contract",
      detail: "A contract exists but is marked expired. Current authorisation could not be confirmed from this record.",
      tone: "caution",
    });
  } else if (match) {
    push(explanation, {
      code: "CONTRACT_NONE",
      title: "No contract found for matched site",
      detail: "Could not verify an active contractor against available authority records.",
      tone: "neutral",
    });
  }

  const contractorCandidates: MatchedContractor[] = [];
  if (match?.contractor) contractorCandidates.push(match.contractor);
  const operatorMatch = matchContractor(
    input.operator.operatorName,
    contractorCandidates,
  );

  let operatorScore = 0;
  let operatorStatus: SectionStatus = "UNAVAILABLE";
  if (operatorMatch && contract?.status === "ACTIVE") {
    operatorScore = config.scores.operatorMatch;
    operatorStatus = "VERIFIED";
    push(explanation, {
      code: "OPERATOR_MATCH",
      title: "Operator name matches sourced contractor",
      detail: `Operator text overlaps with ${operatorMatch.legalName}. This is a name match against records, not independent identity verification.`,
      tone: "positive",
    });
  } else if (
    input.operator.attendantName &&
    (contract?.status === "ACTIVE" || operatorMatch)
  ) {
    operatorScore = config.scores.attendantLinked;
    operatorStatus = "UNCERTAIN";
    push(explanation, {
      code: "ATTENDANT_LINKED",
      title: "Attendant not independently verified",
      detail: "An attendant name was recorded. An individual may collect on behalf of an authorised contractor. This is not proof that the attendant is unauthorised.",
      tone: "neutral",
    });
  } else if (input.operator.operatorName || input.operator.attendantName) {
    operatorStatus = "UNCERTAIN";
    push(explanation, {
      code: "OPERATOR_NO_MATCH",
      title: "Operator could not be matched",
      detail: "Operator/payment recipient could not be matched to an authorised contractor.",
      tone: "caution",
    });
  }

  const personalUpi = isPersonalUpi({
    paymentMode: input.payment.paymentMode,
    upiRecipientName: input.payment.upiRecipientName,
    upiId: input.payment.upiId,
    contractorMatched: Boolean(operatorMatch),
  });

  let paymentScore = 0;
  let paymentStatus: SectionStatus = "UNAVAILABLE";
  if (looksLikeAuthorityPayment(input.payment.upiRecipientName, input.receipt.issuerName)) {
    paymentScore = config.scores.paymentOfficial;
    paymentStatus = "VERIFIED";
    push(explanation, {
      code: "PAYMENT_OFFICIAL",
      title: "Payment text resembles an authority mechanism",
      detail: "Recipient or issuer wording resembles an official parking payment label. This is a text match, not a bank confirmation.",
      tone: "positive",
    });
  } else if (input.payment.paymentMode === "UPI" && operatorMatch) {
    paymentScore = config.scores.paymentContractor;
    paymentStatus = "UNCERTAIN";
    push(explanation, {
      code: "PAYMENT_CONTRACTOR",
      title: "Payment appears linked to a sourced contractor",
      detail: "UPI was used and the operator matched a contractor record. The UPI account itself was not independently verified.",
      tone: "neutral",
    });
  } else if (personalUpi) {
    paymentScore = config.scores.paymentPersonalUpi;
    paymentStatus = "UNCERTAIN";
    push(explanation, {
      code: "PAYMENT_PERSONAL_UPI",
      title: "UPI recipient appears to be an individual",
      detail:
        "A personal UPI recipient does not by itself prove that the parking collection is unauthorised. The attendant may be collecting on behalf of an authorised contractor. Contractor/employee verification is required.",
      tone: "caution",
    });
  } else if (input.payment.paymentMode === "CASH") {
    paymentStatus = "UNCERTAIN";
    push(explanation, {
      code: "PAYMENT_CASH",
      title: "Cash payment recorded",
      detail: "Cash collection cannot be matched to a UPI beneficiary. Receipt evidence is especially important.",
      tone: "neutral",
    });
  } else if (input.payment.paymentMode) {
    paymentStatus = "UNCERTAIN";
  }

  const receiptLooksOfficial = looksLikeAuthorityPayment(
    input.receipt.issuerName ?? input.receipt.parkingNumber,
  );
  let receiptScore = 0;
  let receiptStatus: SectionStatus = "UNAVAILABLE";
  const hasReceipt =
    Boolean(input.receipt.receiptNumber) ||
    Boolean(input.receipt.parkingNumber) ||
    Boolean(input.receipt.deviceNumber) ||
    Boolean(input.receipt.hasImage);

  if (receiptLooksOfficial && hasReceipt) {
    receiptScore = config.scores.receiptOfficial;
    receiptStatus = "VERIFIED";
    push(explanation, {
      code: "RECEIPT_OFFICIAL",
      title: "Receipt resembles an authority parking slip",
      detail: "Issuer or parking number wording resembles an official-style receipt. Visual similarity is not authentication of a device or issuer.",
      tone: "positive",
    });
  } else if (hasReceipt && operatorMatch) {
    receiptScore = config.scores.receiptContractor;
    receiptStatus = "UNCERTAIN";
    push(explanation, {
      code: "RECEIPT_CONTRACTOR",
      title: "Receipt present, contractor-linked",
      detail: "A receipt was recorded and the operator matched a contractor. The slip was not independently authenticated.",
      tone: "neutral",
    });
  } else if (hasReceipt) {
    receiptStatus = "UNCERTAIN";
    push(explanation, {
      code: "RECEIPT_UNVERIFIED",
      title: "Receipt recorded but not matched",
      detail: "A receipt or slip details were provided, but they could not be matched to a sourced authority issuer.",
      tone: "neutral",
    });
  } else {
    push(explanation, {
      code: "RECEIPT_MISSING",
      title: "No receipt recorded",
      detail: "No receipt number, parking number, or receipt image was provided.",
      tone: "neutral",
    });
  }

  const amount = input.payment.amount ?? input.receipt.amount ?? null;
  const approvedRate = exactLocation ? (match?.approvedRate ?? null) : null;
  let rateScore = 0;
  let rateStatus: SectionStatus = "UNAVAILABLE";
  let isOvercharging = false;

  if (amount != null && approvedRate != null) {
    const tolerance = 0.5;
    if (Math.abs(amount - approvedRate) <= tolerance) {
      rateScore = config.scores.rateMatch;
      rateStatus = "VERIFIED";
      push(explanation, {
        code: "RATE_MATCH",
        title: "Amount matches the sourced approved rate",
        detail: `Charged amount matches the sourced rate of ₹${approvedRate} at the closely matched site.`,
        tone: "positive",
      });
    } else if (amount > approvedRate + tolerance) {
      rateScore = config.scores.rateDiffers;
      rateStatus = "CONFLICTING";
      isOvercharging = true;
      push(explanation, {
        code: "RATE_OVER",
        title: "Amount exceeds the sourced approved rate",
        detail: `Charged ₹${amount} versus sourced approved rate ₹${approvedRate} at a closely matched site. This is an evidence conflict, not a legal finding of an offence.`,
        tone: "negative",
      });
    } else {
      rateScore = config.scores.rateDiffers;
      rateStatus = "CONFLICTING";
      push(explanation, {
        code: "RATE_DIFFERS",
        title: "Amount differs from the sourced approved rate",
        detail: `Charged ₹${amount} versus sourced approved rate ₹${approvedRate}. Difference could be a different vehicle class, duration, or record mismatch.`,
        tone: "caution",
      });
    }
  } else if (amount != null && match?.approvedRate != null && !exactLocation) {
    rateStatus = "UNCERTAIN";
    push(explanation, {
      code: "RATE_NOT_APPLIED",
      title: "Approved rate not applied to this pin",
      detail: `A sourced rate of ₹${match.approvedRate} exists for a nearby site, but this location is not an exact match, so the rate is not treated as proven for this collection point.`,
      tone: "neutral",
    });
  } else {
    push(explanation, {
      code: "RATE_UNAVAILABLE",
      title: "Approved rate unavailable for this point",
      detail: "No sourced approved rate could be applied to this exact location.",
      tone: "neutral",
    });
  }

  let evidenceScore =
    locationScore +
    contractScore +
    operatorScore +
    rateScore +
    receiptScore +
    paymentScore;
  evidenceScore = Math.max(0, Math.min(100, evidenceScore));

  let classification = classifyFromScore(evidenceScore, config, isOvercharging);

  // Personal UPI must never, by itself, produce an "unauthorised" or "illegal" result.
  if (
    personalUpi &&
    !isOvercharging &&
    classification !== "VERIFIED_LEGAL" &&
    classification !== "LIKELY_LEGAL"
  ) {
    classification = "NEEDS_VERIFICATION";
    push(explanation, {
      code: "PERSONAL_UPI_FLOOR",
      title: "Needs verification — personal UPI is not proof of unauthorised collection",
      detail:
        "Operator/payment recipient could not be matched to an authorised contractor. A personal UPI recipient does not by itself prove that the parking collection is unauthorised. The attendant may be collecting on behalf of an authorised contractor. Contractor/employee verification is required.",
      tone: "caution",
    });
  }

  const evidenceStatus: SectionStatus = hasReceipt || input.receipt.hasImage
    ? receiptStatus
    : "UNAVAILABLE";

  return {
    classification,
    evidenceScore,
    locationScore,
    contractScore,
    operatorScore,
    rateScore,
    receiptScore,
    paymentScore,
    matchedSiteId: match?.id ?? null,
    matchedContractId: contract?.id ?? null,
    matchedContractorId: operatorMatch?.id ?? match?.contractor?.id ?? null,
    distanceMeters,
    isOvercharging,
    personalUpi,
    sectionStatuses: {
      location: locationStatus,
      operator: operatorStatus,
      payment: paymentStatus,
      receipt: receiptStatus,
      authority: authorityStatus,
      rate: rateStatus,
      evidence: evidenceStatus,
    },
    explanation,
  };
}

export function isPersonalUpi(input: {
  paymentMode?: string | null;
  upiRecipientName?: string | null;
  upiId?: string | null;
  contractorMatched?: boolean;
}): boolean {
  if (input.paymentMode !== "UPI") return false;
  if (input.contractorMatched) return false;
  const name = input.upiRecipientName ?? "";
  const id = input.upiId ?? "";
  if (looksLikeAuthorityPayment(name) || looksLikeOrganisation(name)) return false;
  if (looksLikeAuthorityPayment(id) || looksLikeOrganisation(id)) return false;
  return Boolean(name.trim() || id.trim());
}

export function configFromRows(
  rows: { key: string; value_numeric: number | string | null }[],
): VerificationConfig {
  const map = new Map(rows.map((r) => [r.key, Number(r.value_numeric)]));
  const d = DEFAULT_VERIFICATION_CONFIG;
  const num = (key: string, fallback: number) =>
    Number.isFinite(map.get(key)) ? (map.get(key) as number) : fallback;
  return {
    scores: {
      locationExact: num("score.locationExact", d.scores.locationExact),
      locationNearby: num("score.locationNearby", d.scores.locationNearby),
      contractActive: num("score.contractActive", d.scores.contractActive),
      contractExpired: num("score.contractExpired", d.scores.contractExpired),
      operatorMatch: num("score.operatorMatch", d.scores.operatorMatch),
      attendantLinked: num("score.attendantLinked", d.scores.attendantLinked),
      rateMatch: num("score.rateMatch", d.scores.rateMatch),
      rateDiffers: num("score.rateDiffers", d.scores.rateDiffers),
      receiptOfficial: num("score.receiptOfficial", d.scores.receiptOfficial),
      receiptContractor: num("score.receiptContractor", d.scores.receiptContractor),
      paymentOfficial: num("score.paymentOfficial", d.scores.paymentOfficial),
      paymentContractor: num("score.paymentContractor", d.scores.paymentContractor),
      paymentPersonalUpi: num(
        "score.paymentPersonalUpi",
        d.scores.paymentPersonalUpi,
      ),
    },
    thresholds: {
      exactMatchMeters: num(
        "threshold.exactMatchMeters",
        d.thresholds.exactMatchMeters,
      ),
      nearbyMatchMeters: num(
        "threshold.nearbyMatchMeters",
        d.thresholds.nearbyMatchMeters,
      ),
      verifiedMin: num("threshold.verifiedMin", d.thresholds.verifiedMin),
      likelyMin: num("threshold.likelyMin", d.thresholds.likelyMin),
      needsVerificationMin: num(
        "threshold.needsVerificationMin",
        d.thresholds.needsVerificationMin,
      ),
      potentiallyUnauthorisedMin: num(
        "threshold.potentiallyUnauthorisedMin",
        d.thresholds.potentiallyUnauthorisedMin,
      ),
    },
  };
}
