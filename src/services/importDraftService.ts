import {
  ExtractedField,
  ImportDraftInput,
  ParsedProfileText,
} from "../types/domain";
import { parseProfileText } from "./profileTextParser";

export interface InMemoryImportDraft {
  id: string;
  sourceType: string;
  sourceUrl?: string;
  rawText: string | null;
  extractedJson: string;
  missingInfoJson: string;
  warningsJson: string;
  confidence: string;
  status: "draft" | "reviewed" | "accepted" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}
export interface DuplicateCandidate {
  id: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  sourceUrl?: string | null;
}

export type ImportAcceptStatus = "accepted" | "skipped" | "manual_review";

export interface ImportAcceptFieldResult {
  fieldId?: string;
  entity: ExtractedField["entity"];
  fieldName: string;
  value: string;
  status: ImportAcceptStatus;
  message: string;
  target?: string;
}

export interface ImportAcceptWarning {
  code: string;
  entity: ExtractedField["entity"];
  fieldName: string;
  value: string;
  message: string;
  fieldId?: string;
}

export function createImportDraft(
  input: ImportDraftInput,
): InMemoryImportDraft {
  const parsed = parseProfileText(input.rawText);
  const now = new Date();
  return {
    id: `draft-${now.getTime()}`,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl,
    rawText: input.rawText,
    extractedJson: JSON.stringify(parsed),
    missingInfoJson: JSON.stringify(parsed.missingInfo),
    warningsJson: JSON.stringify(parsed.warnings),
    confidence: parsed.confidence,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function analyzeImportDraft(
  draft: InMemoryImportDraft,
): InMemoryImportDraft {
  const parsed = parseProfileText(draft.rawText ?? "");
  return {
    ...draft,
    extractedJson: JSON.stringify(parsed),
    missingInfoJson: JSON.stringify(parsed.missingInfo),
    warningsJson: JSON.stringify(parsed.warnings),
    confidence: parsed.confidence,
    updatedAt: new Date(),
  };
}

export function discardImportDraft(
  draft: InMemoryImportDraft,
): InMemoryImportDraft {
  return { ...draft, status: "rejected", updatedAt: new Date() };
}

export function deleteRawText(draft: InMemoryImportDraft): InMemoryImportDraft {
  return { ...draft, rawText: "", updatedAt: new Date() };
}

export function findDuplicatePersons(
  parsed: ParsedProfileText,
  candidates: DuplicateCandidate[],
  sourceUrl?: string,
): DuplicateCandidate[] {
  const displayName = parsed.person
    .find((f) => f.fieldName === "displayName")
    ?.value.toLowerCase();
  const firstName = parsed.person
    .find((f) => f.fieldName === "firstName")
    ?.value.toLowerCase();
  const lastName = parsed.person
    .find((f) => f.fieldName === "lastName")
    ?.value.toLowerCase();
  const city = parsed.person
    .find((f) => f.fieldName === "city")
    ?.value.toLowerCase();
  return candidates.filter((candidate) => {
    const candidateName = candidate.displayName.toLowerCase();
    if (displayName && candidateName === displayName) return true;
    if (sourceUrl && candidate.sourceUrl === sourceUrl) return true;
    if (
      firstName &&
      lastName &&
      candidate.firstName?.toLowerCase() === firstName &&
      candidate.lastName?.toLowerCase() === lastName
    )
      return true;
    return Boolean(
      displayName &&
        city &&
        candidateName === displayName &&
        candidate.city?.toLowerCase() === city,
    );
  });
}

function selectedFieldsToEntityInput(
  fields: ExtractedField[],
  entity: ExtractedField["entity"],
): Record<string, string> {
  return fields
    .filter((field) => field.entity === entity)
    .reduce<
      Record<string, string>
    >((acc, item) => ({ ...acc, [item.fieldName]: item.value.trim() }), {});
}

export function selectedFieldsToPersonInput(
  fields: ExtractedField[],
): Record<string, string> {
  return selectedFieldsToEntityInput(fields, "person");
}

export function selectedFieldsToGroupInputs(
  fields: ExtractedField[],
): Array<{ name: string; sourceField: ExtractedField }> {
  return fields
    .filter((field) => field.entity === "group" && field.fieldName === "name")
    .map((field) => ({ name: field.value.trim(), sourceField: field }))
    .filter((group) => group.name.length > 0);
}

export function selectedFieldsToRelationshipInputs(
  fields: ExtractedField[],
): Array<{ relationshipType: string; targetName: string; sourceField: ExtractedField }> {
  return fields
    .filter((field) => field.entity === "relationship")
    .map((field) => ({
      relationshipType: field.fieldName.trim() || "unklar",
      targetName: field.value.trim(),
      sourceField: field,
    }))
    .filter((relationship) => relationship.targetName.length > 0);
}

export function selectedFieldsToVehicleInputs(
  fields: ExtractedField[],
): Array<{
  manufacturer?: string;
  model?: string;
  color?: string;
  licensePlate?: string;
  vehicleType: string;
  sourceFields: ExtractedField[];
}> {
  const vehicleFields = fields.filter((field) => field.entity === "vehicle");
  if (!vehicleFields.length) return [];

  const input = vehicleFields.reduce(
    (acc, field) => {
      if (field.fieldName === "licensePlate") acc.licensePlate = field.value.trim();
      if (field.fieldName === "vehicle") {
        const parts = field.value.trim().split(/\s+/).filter(Boolean);
        const colorWords: Record<string, string> = {
          schwarzer: "schwarz",
          schwarze: "schwarz",
          weißer: "weiß",
          weiße: "weiß",
          roter: "rot",
          rote: "rot",
          blauer: "blau",
          blaue: "blau",
          grauer: "grau",
          graue: "grau",
        };
        if (parts[0] && colorWords[parts[0].toLowerCase()]) {
          acc.color = colorWords[parts[0].toLowerCase()];
          parts.shift();
        }
        if (parts.length === 1) acc.manufacturer = parts[0];
        if (parts.length > 1) {
          acc.manufacturer = parts[0];
          acc.model = parts.slice(1).join(" ");
        }
      }
      return acc;
    },
    { vehicleType: "Auto", sourceFields: vehicleFields } as {
      manufacturer?: string;
      model?: string;
      color?: string;
      licensePlate?: string;
      vehicleType: string;
      sourceFields: ExtractedField[];
    },
  );

  return input.manufacturer || input.model || input.licensePlate ? [input] : [];
}
