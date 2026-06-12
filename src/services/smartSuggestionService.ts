import { EvidenceType, SuggestedEntityType } from "../types/domain";
import { isNearDuplicate } from "./imageHashService";

export interface SuggestionCandidate {
  id: string;
  entityType: SuggestedEntityType;
  displayName: string;
  photoPath?: string | null;
  sourceUrl?: string | null;
  sourceImportDraftId?: string | null;
}
export interface MediaLike {
  id: string;
  originalFileName: string;
  sha256Hash: string;
  perceptualHash: string;
  sourceUrl?: string | null;
  sourceImportDraftId?: string | null;
}
export interface ExistingMediaLike {
  id: string;
  sha256Hash: string;
  perceptualHash: string;
  linkedEntityType?: SuggestedEntityType | null;
  linkedEntityId?: string | null;
}
export interface ImageSuggestionDraft {
  mediaAssetId: string;
  suggestedEntityType: SuggestedEntityType;
  suggestedEntityId: string;
  reason: string;
  evidenceType: EvidenceType;
  confidence: "low" | "medium" | "high";
}

function suggestion(
  mediaAssetId: string,
  entityType: SuggestedEntityType,
  entityId: string,
  reason: string,
  evidenceType: EvidenceType,
  confidence: "low" | "medium" | "high",
): ImageSuggestionDraft {
  return {
    mediaAssetId,
    suggestedEntityType: entityType,
    suggestedEntityId: entityId,
    reason,
    evidenceType,
    confidence,
  };
}

export function createImageSuggestions(
  media: MediaLike,
  existingMedia: ExistingMediaLike[],
  candidates: SuggestionCandidate[],
): ImageSuggestionDraft[] {
  const suggestions: ImageSuggestionDraft[] = [];
  const filename = media.originalFileName.toLowerCase();

  for (const existing of existingMedia) {
    if (!existing.linkedEntityType || !existing.linkedEntityId) continue;
    if (existing.sha256Hash === media.sha256Hash)
      suggestions.push(
        suggestion(
          media.id,
          existing.linkedEntityType,
          existing.linkedEntityId,
          "Bild ist identisch mit einem bereits gespeicherten Bild.",
          "exact_duplicate",
          "high",
        ),
      );
    else if (isNearDuplicate(existing.perceptualHash, media.perceptualHash))
      suggestions.push(
        suggestion(
          media.id,
          existing.linkedEntityType,
          existing.linkedEntityId,
          "Bild ähnelt einer bereits gespeicherten Datei.",
          "near_duplicate",
          "medium",
        ),
      );
  }

  for (const candidate of candidates) {
    const normalizedName = candidate.displayName.toLowerCase();
    if (
      media.sourceImportDraftId &&
      candidate.sourceImportDraftId === media.sourceImportDraftId
    ) {
      suggestions.push(
        suggestion(
          media.id,
          candidate.entityType,
          candidate.id,
          "Bild stammt aus demselben Import-Entwurf.",
          "same_import_draft",
          "medium",
        ),
      );
      if (!candidate.photoPath)
        suggestions.push(
          suggestion(
            media.id,
            candidate.entityType,
            candidate.id,
            candidate.entityType === "vehicle"
              ? "Dieses Fahrzeug hat noch kein Bild."
              : "Diese Person hat noch kein Profilbild.",
            candidate.entityType === "vehicle"
              ? "missing_vehicle_photo"
              : "missing_profile_photo",
            "medium",
          ),
        );
    }
    if (media.sourceUrl && candidate.sourceUrl === media.sourceUrl)
      suggestions.push(
        suggestion(
          media.id,
          candidate.entityType,
          candidate.id,
          "Mögliche Zuordnung prüfen: Quelle/Profil-Link stimmt überein.",
          "matching_source_url",
          "medium",
        ),
      );
    if (
      normalizedName &&
      normalizedName.split(/\s+/).every((part) => filename.includes(part))
    )
      suggestions.push(
        suggestion(
          media.id,
          candidate.entityType,
          candidate.id,
          "Dateiname enthält den Namen dieser Person.",
          "filename_hint",
          "medium",
        ),
      );
  }

  const unique = new Map<string, ImageSuggestionDraft>();
  for (const item of suggestions)
    unique.set(
      `${item.suggestedEntityType}:${item.suggestedEntityId}:${item.evidenceType}`,
      item,
    );
  return [...unique.values()];
}
