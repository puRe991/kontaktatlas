export type Confidence = "low" | "medium" | "high";
export type ImportDraftStatus = "draft" | "reviewed" | "accepted" | "rejected";
export type SuggestedEntityType =
  | "person"
  | "vehicle"
  | "importDraft"
  | "group";
export type LinkedEntityType = SuggestedEntityType | "none";
export type EvidenceType =
  | "exact_duplicate"
  | "near_duplicate"
  | "same_import_draft"
  | "matching_source_url"
  | "filename_hint"
  | "missing_profile_photo"
  | "missing_vehicle_photo"
  | "manual_candidate";
export type SuggestionStatus = "pending" | "accepted" | "rejected";
export type Severity = "info" | "warning" | "critical";

export const SENSITIVE_FIELDS = new Set([
  "address",
  "phone",
  "email",
  "birthDate",
  "licensePlate",
  "photoPath",
]);

export interface ExtractedField {
  id: string;
  entity: "person" | "relationship" | "group" | "vehicle";
  fieldName: string;
  value: string;
  confidence: Confidence;
  sourceText: string;
  warning?: string;
  sensitive?: boolean;
  selectedByDefault: boolean;
}

export interface ParsedProfileText {
  person: ExtractedField[];
  relationships: ExtractedField[];
  groups: ExtractedField[];
  vehicles: ExtractedField[];
  missingInfo: Array<{
    fieldName: string;
    message: string;
    severity: Severity;
  }>;
  warnings: string[];
  confidence: Confidence;
}

export interface PersonInput {
  firstName?: string;
  lastName?: string;
  displayName: string;
  nickname?: string;
  birthDate?: string;
  city?: string;
  originCity?: string;
  address?: string;
  phone?: string;
  email?: string;
  role?: string;
  description?: string;
  photoPath?: string;
  archived?: boolean;
}

export interface VehicleInput {
  manufacturer?: string;
  model?: string;
  color?: string;
  year?: number;
  licensePlate?: string;
  vehicleType?: string;
  photoPath?: string;
  specialFeatures?: string;
  archived?: boolean;
}

export interface RelationshipInput {
  personAId: string;
  personBId?: string;
  relationshipType: string;
  direction?: string;
  strength?: number;
  confidence: Confidence;
  sourceId?: string;
  description?: string;
  sinceDate?: string;
}

export interface ImportDraftInput {
  sourceType: string;
  sourceUrl?: string;
  rawText: string;
  screenshotPath?: string;
}

export interface CompletenessResult {
  completenessScore: number;
  missingInfo: Array<{
    fieldName: string;
    message: string;
    severity: Severity;
  }>;
  warnings: string[];
  nextSteps: string[];
}

export interface DashboardStats {
  personsTotal: number;
  relationshipsTotal: number;
  vehiclesTotal: number;
  openImportDrafts: number;
  personsWithMissingInfo: number;
  personsWithoutRelationships: number;
  personsWithoutPhoto: number;
  uncertainRelationships: number;
  vehiclesWithoutAssignment: number;
  openImageAssignments: number;
  unassignedImages: number;
  importDraftsWithOpenMedia: number;
}
