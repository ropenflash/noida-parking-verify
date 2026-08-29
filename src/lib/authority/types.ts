import type { ContractStatus, ContractorStatus, ParkingType } from "@/lib/types";

export const AUTHORITY_SOURCE_TYPES = [
  "NOIDA_AUTHORITY",
  "UP_ETENDER",
  "RTI_RESPONSE",
  "GOVERNMENT_NOTICE",
  "OFFICIAL_DOCUMENT",
] as const;
export type AuthoritySourceType = (typeof AUTHORITY_SOURCE_TYPES)[number];

export const REJECTED_AUTHORITY_SOURCE_HINTS = [
  "newspaper",
  "times of india",
  "google maps",
  "reddit",
  "user report",
  "facebook",
  "twitter",
  "instagram",
];

export const AUTHORITY_WORKFLOW = [
  "DOCUMENT",
  "EXTRACTION",
  "PROPOSED",
  "REVIEW",
  "VERIFIED",
  "ACTIVE",
  "EXPIRED",
  "REJECTED",
] as const;
export type AuthorityWorkflowStatus = (typeof AUTHORITY_WORKFLOW)[number];

export type AuthorityVerificationStatus =
  | "UNVERIFIED"
  | "PROPOSED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";

export type AuthorityEntityKind = "SITE" | "CONTRACT" | "CONTRACTOR" | "TENDER" | "RATE";
export type AuthorityReviewStatus = "PROPOSED" | "APPROVED" | "REJECTED";
export type AuthorityMatchKind = "EXACT_MATCH" | "NEARBY_MATCH" | "NO_MATCH";

export type AuthorityProvenance = {
  sourceType: AuthoritySourceType | string;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceDocumentId: string | null;
  publicationDate: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  extractedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationStatus: AuthorityVerificationStatus | string;
  confidenceScore: number | null;
};

export type ProposedPayload = {
  name?: string;
  sector?: string;
  address?: string;
  landmark?: string;
  latitude?: number | null;
  longitude?: number | null;
  parkingType?: ParkingType | string | null;
  cluster?: string;
  workCircle?: string;
  tenderNumber?: string;
  contractNumber?: string;
  contractorName?: string;
  contractorId?: string;
  parkingSiteId?: string;
  approvedRate?: number | null;
  rateUnit?: string;
  vehicleType?: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  notes?: string;
  rawText?: string;
};

export type ExtractedProposal = {
  entityKind: AuthorityEntityKind;
  payload: ProposedPayload;
  confidenceScore: number;
};

export type AuthoritativeSiteResult = {
  id: string;
  name: string;
  sector: string | null;
  address: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  parkingType: string | null;
  cluster: string | null;
  workCircle: string | null;
  tenderNumber: string | null;
  contractNumber: string | null;
  distanceMeters: number;
  matchKind: AuthorityMatchKind;
  isDemo: boolean;
  officialStatus: string | null;
  activeContracts: {
    id: string;
    contractNumber: string | null;
    tenderNumber: string | null;
    status: ContractStatus | string;
    startDate: string | null;
    endDate: string | null;
    approvedRate: number | null;
    contractor: {
      id: string;
      legalName: string;
      displayName: string | null;
      verificationStatus: ContractorStatus | string;
    } | null;
    rates: {
      amount: number;
      unit: string;
      vehicleType: string | null;
      effectiveFrom: string | null;
      effectiveTo: string | null;
    }[];
    provenance: AuthorityProvenance;
  }[];
  provenance: AuthorityProvenance;
};

export type AuthoritativeParkingStatus = {
  requestedDate: string;
  latitude: number;
  longitude: number;
  exactMatchMeters: number;
  nearbyMatchMeters: number;
  matchKind: AuthorityMatchKind;
  matchingSites: AuthoritativeSiteResult[];
  confidence: number | null;
  explanation: string[];
};
