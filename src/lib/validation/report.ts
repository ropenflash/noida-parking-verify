import { z } from "zod";
import {
  EVIDENCE_CATEGORIES,
  PARKING_TYPES,
  PAYMENT_MODES,
} from "@/lib/types";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const locationSchema = z.object({
  sector: optionalText,
  address: optionalText,
  landmark: optionalText,
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  googleMapsUrl: z.string().url().optional().or(z.literal("")).transform((v) => v || undefined),
  description: optionalText,
  parkingType: z.enum(PARKING_TYPES).optional(),
});

export const operatorSchema = z.object({
  operatorName: optionalText,
  attendantName: optionalText,
  attendantId: optionalText,
  phone: optionalText,
  uniformIdVisible: z.boolean().optional().nullable(),
  contractorOnSign: z.boolean().optional().nullable(),
  contractNumber: optionalText,
  parkingLicenceNumber: optionalText,
  notes: optionalText,
});

export const paymentSchema = z.object({
  amount: z.coerce.number().min(0).max(100000).optional().nullable(),
  paymentMode: z.enum(PAYMENT_MODES).optional(),
  upiRecipientName: optionalText,
  upiId: optionalText,
  utr: optionalText,
  paymentTimestamp: z.string().optional(),
  receiptAvailable: z.boolean().optional().nullable(),
});

export const receiptSchema = z.object({
  receiptNumber: optionalText,
  parkingNumber: optionalText,
  spotNumber: optionalText,
  deviceNumber: optionalText,
  entryTime: z.string().optional(),
  exitTime: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(0).optional().nullable(),
  amount: z.coerce.number().min(0).optional().nullable(),
  issuerName: optionalText,
  receiptText: optionalText,
});

export const reportPayloadSchema = z.object({
  location: locationSchema,
  operator: operatorSchema,
  payment: paymentSchema,
  receipt: receiptSchema,
  visibility: z.enum(["PRIVATE", "ANONYMISED_PUBLIC"]).default("PRIVATE"),
  evidence: z
    .array(
      z.object({
        storagePath: z.string().min(1),
        category: z.enum(EVIDENCE_CATEGORIES),
        capturedAt: z.string().optional(),
      }),
    )
    .default([]),
});

export type ReportPayload = z.infer<typeof reportPayloadSchema>;

export const searchSchema = z.object({
  q: z.string().trim().min(1).max(200),
});

export const adminSiteSchema = z.object({
  name: z.string().trim().min(2),
  sector: optionalText,
  address: optionalText,
  landmark: optionalText,
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  parkingType: z.enum(PARKING_TYPES).optional(),
  authority: optionalText,
  workCircle: optionalText,
  cluster: optionalText,
  officialStatus: z.enum(["AUTHORISED", "UNVERIFIED", "EXPIRED", "DISPUTED"]),
  sourceId: z.string().uuid().optional(),
  sourceUrl: optionalText,
  notes: optionalText,
});

export const adminContractorSchema = z.object({
  legalName: z.string().trim().min(2),
  displayName: optionalText,
  contactPhone: optionalText,
  contactEmail: z.string().email().optional().or(z.literal("")),
  verificationStatus: z.enum(["VERIFIED", "UNVERIFIED", "EXPIRED", "DISPUTED"]),
  sourceId: z.string().uuid().optional(),
  notes: optionalText,
});

export const adminContractSchema = z.object({
  contractorId: z.string().uuid(),
  parkingSiteId: z.string().uuid().optional(),
  contractNumber: optionalText,
  cluster: optionalText,
  workCircle: optionalText,
  startDate: optionalText,
  endDate: optionalText,
  approvedRate: z.coerce.number().optional().nullable(),
  status: z.enum(["ACTIVE", "EXPIRED", "PENDING", "DISPUTED"]),
  sourceId: z.string().uuid().optional(),
  sourceUrl: optionalText,
  notes: optionalText,
});

export const adminSourceSchema = z.object({
  sourceType: z.enum([
    "NOIDA_AUTHORITY",
    "UP_ETENDER",
    "RTI_RESPONSE",
    "GOVERNMENT_NOTICE",
    "OFFICIAL_DOCUMENT",
    "GOVERNMENT_DOCUMENT",
    "OFFICIAL_NOTICE",
    "OTHER",
  ]),
  authority: optionalText,
  sourceTitle: z.string().trim().min(3),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sourceDate: optionalText,
  effectiveDate: optionalText,
  expiryDate: optionalText,
  notes: optionalText,
});

export const adminRateSchema = z.object({
  parkingSiteId: z.string().uuid(),
  contractId: z.string().uuid().optional(),
  rateAmount: z.coerce.number().positive(),
  unit: z.string().default("per visit"),
  vehicleType: optionalText,
  effectiveFrom: optionalText,
  effectiveTo: optionalText,
  sourceId: z.string().uuid().optional(),
  notes: optionalText,
});

export const adminOverrideSchema = z.object({
  reportId: z.string().uuid(),
  classification: z.enum([
    "VERIFIED_LEGAL",
    "LIKELY_LEGAL",
    "NEEDS_VERIFICATION",
    "POTENTIALLY_UNAUTHORISED",
    "OVERCHARGING",
    "UNKNOWN",
  ]),
  reason: z.string().trim().min(8),
  duplicateOf: z.string().uuid().optional(),
});
