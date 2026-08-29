export const USER_ROLES = ["USER", "MODERATOR", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PARKING_TYPES = [
  "ON_STREET",
  "OFF_STREET",
  "COMMERCIAL_COMPLEX",
  "MARKET",
  "METRO",
  "VACANT_PLOT",
  "OTHER",
] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];

export const CLASSIFICATIONS = [
  "VERIFIED_LEGAL",
  "LIKELY_LEGAL",
  "NEEDS_VERIFICATION",
  "POTENTIALLY_UNAUTHORISED",
  "OVERCHARGING",
  "UNKNOWN",
] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const PAYMENT_MODES = ["CASH", "UPI", "CARD", "OTHER"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const EVIDENCE_CATEGORIES = [
  "PARKING_SIGN",
  "PARKING_BOOTH",
  "OPERATOR_ID",
  "QR_CODE",
  "RECEIPT",
  "PARKING_AREA",
  "OTHER",
] as const;
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

export const CONTRACTOR_STATUSES = [
  "VERIFIED",
  "UNVERIFIED",
  "EXPIRED",
  "DISPUTED",
] as const;
export type ContractorStatus = (typeof CONTRACTOR_STATUSES)[number];

export const CONTRACT_STATUSES = [
  "ACTIVE",
  "EXPIRED",
  "PENDING",
  "DISPUTED",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const SOURCE_TYPES = [
  "NOIDA_AUTHORITY",
  "UP_ETENDER",
  "RTI_RESPONSE",
  "GOVERNMENT_NOTICE",
  "OFFICIAL_DOCUMENT",
  "GOVERNMENT_DOCUMENT",
  "OFFICIAL_NOTICE",
  "OTHER",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SECTION_STATUSES = [
  "VERIFIED",
  "UNCERTAIN",
  "CONFLICTING",
  "UNAVAILABLE",
] as const;
export type SectionStatus = (typeof SECTION_STATUSES)[number];

export type UpiRecipientKind =
  | "UNKNOWN"
  | "INDIVIDUAL"
  | "CONTRACTOR"
  | "AUTHORITY";

export type VerificationConfig = {
  scores: {
    locationExact: number;
    locationNearby: number;
    contractActive: number;
    contractExpired: number;
    operatorMatch: number;
    attendantLinked: number;
    rateMatch: number;
    rateDiffers: number;
    receiptOfficial: number;
    receiptContractor: number;
    paymentOfficial: number;
    paymentContractor: number;
    paymentPersonalUpi: number;
  };
  thresholds: {
    exactMatchMeters: number;
    nearbyMatchMeters: number;
    verifiedMin: number;
    likelyMin: number;
    needsVerificationMin: number;
    potentiallyUnauthorisedMin: number;
  };
};

export type MatchedSite = {
  id: string;
  name: string;
  sector: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  officialStatus: string | null;
  isDemo: boolean;
  distanceMeters: number;
  contract?: MatchedContract | null;
  contractor?: MatchedContractor | null;
  approvedRate?: number | null;
  rateUnit?: string | null;
};

export type MatchedContract = {
  id: string;
  contractNumber: string | null;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  approvedRate: number | null;
};

export type MatchedContractor = {
  id: string;
  legalName: string;
  displayName: string | null;
  verificationStatus: ContractorStatus;
};

export type VerificationInput = {
  location: {
    sector?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    parkingType?: ParkingType | null;
  };
  operator: {
    operatorName?: string | null;
    attendantName?: string | null;
    contractNumber?: string | null;
    parkingLicenceNumber?: string | null;
    contractorOnSign?: boolean | null;
    uniformIdVisible?: boolean | null;
  };
  payment: {
    amount?: number | null;
    paymentMode?: PaymentMode | null;
    upiRecipientName?: string | null;
    upiId?: string | null;
  };
  receipt: {
    parkingNumber?: string | null;
    spotNumber?: string | null;
    deviceNumber?: string | null;
    issuerName?: string | null;
    receiptNumber?: string | null;
    amount?: number | null;
    hasImage?: boolean;
  };
  nearbySites: MatchedSite[];
};

export type ExplanationItem = {
  code: string;
  title: string;
  detail: string;
  tone: "positive" | "neutral" | "caution" | "negative";
};

export type VerificationOutput = {
  classification: Classification;
  evidenceScore: number;
  locationScore: number;
  contractScore: number;
  operatorScore: number;
  rateScore: number;
  receiptScore: number;
  paymentScore: number;
  matchedSiteId: string | null;
  matchedContractId: string | null;
  matchedContractorId: string | null;
  distanceMeters: number | null;
  isOvercharging: boolean;
  personalUpi: boolean;
  sectionStatuses: {
    location: SectionStatus;
    operator: SectionStatus;
    payment: SectionStatus;
    receipt: SectionStatus;
    authority: SectionStatus;
    rate: SectionStatus;
    evidence: SectionStatus;
  };
  explanation: ExplanationItem[];
};

export type Profile = {
  id: string;
  role: UserRole;
  display_name: string | null;
  is_anonymous: boolean;
};
