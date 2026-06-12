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

export function selectedFieldsToPersonInput(
  fields: ExtractedField[],
): Record<string, string> {
  return fields
    .filter((field) => field.entity === "person")
    .reduce<
      Record<string, string>
    >((acc, item) => ({ ...acc, [item.fieldName]: item.value }), {});
}
