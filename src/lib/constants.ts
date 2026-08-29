export const PARKING_TYPE_LABELS: Record<string, string> = {
  ON_STREET: "On-street",
  OFF_STREET: "Off-street",
  COMMERCIAL_COMPLEX: "Commercial complex",
  MARKET: "Market",
  METRO: "Metro parking",
  VACANT_PLOT: "Vacant plot",
  OTHER: "Other",
};

export const CLASSIFICATION_LABELS: Record<string, string> = {
  VERIFIED_LEGAL: "Verified",
  LIKELY_LEGAL: "Likely authorised",
  NEEDS_VERIFICATION: "Needs verification",
  POTENTIALLY_UNAUTHORISED: "Potentially unauthorised",
  OVERCHARGING: "Overcharging",
  UNKNOWN: "Insufficient evidence",
};

export const CLASSIFICATION_HELP: Record<string, string> = {
  VERIFIED_LEGAL: "Strong evidence alignment with sourced authority records. Not a legal determination.",
  LIKELY_LEGAL: "Evidence suggests authorisation, with some gaps. Not a legal determination.",
  NEEDS_VERIFICATION: "Could not verify authorisation from available records. Further checks are required.",
  POTENTIALLY_UNAUTHORISED: "Evidence conflicts with available authority records or is weak. Requires authority confirmation.",
  OVERCHARGING: "Charged amount exceeds the sourced approved rate at a closely matched site.",
  UNKNOWN: "Insufficient evidence to classify this collection point.",
};

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

export const EVIDENCE_CATEGORY_LABELS: Record<string, string> = {
  PARKING_SIGN: "Parking sign",
  PARKING_BOOTH: "Parking booth",
  OPERATOR_ID: "Operator/attendant ID",
  QR_CODE: "QR / payment screenshot",
  RECEIPT: "Parking receipt",
  PARKING_AREA: "Parking area",
  OTHER: "Other",
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  NOIDA_AUTHORITY: "Noida Authority",
  UP_ETENDER: "UP eTender",
  RTI_RESPONSE: "RTI response",
  GOVERNMENT_NOTICE: "Government notice",
  OFFICIAL_DOCUMENT: "Official document",
  GOVERNMENT_DOCUMENT: "Government document",
  OFFICIAL_NOTICE: "Official notice",
  OTHER: "Other",
};

export const LEGAL_DISCLAIMER =
  "This verification is an evidence-based assessment and is not a legal determination.";

export const NOIDA_CENTER = { lat: 28.5355, lng: 77.391 };