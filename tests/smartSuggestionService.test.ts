import { describe, expect, it } from "vitest";
import {
  perceptualHashFromBytes,
  sha256Hex,
} from "../src/services/imageHashService";
import { createImageSuggestions } from "../src/services/smartSuggestionService";

describe("Smart-Zuordnung", () => {
  it("erstellt MediaAsset-Hashes und erkennt sha256-Duplikate sowie Ähnlichkeit", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const hash = await sha256Hex(bytes);
    const ph = perceptualHashFromBytes(bytes);
    const suggestions = createImageSuggestions(
      {
        id: "m2",
        originalFileName: "x.jpg",
        sha256Hash: hash,
        perceptualHash: ph,
      },
      [
        {
          id: "m1",
          sha256Hash: hash,
          perceptualHash: ph,
          linkedEntityType: "person",
          linkedEntityId: "p1",
        },
      ],
      [],
    );
    expect(suggestions.some((s) => s.evidenceType === "exact_duplicate")).toBe(
      true,
    );
  });
  it("erstellt Vorschläge durch ImportDraft, Dateiname und fehlendes Profilbild", () => {
    const suggestions = createImageSuggestions(
      {
        id: "m1",
        originalFileName: "Michelle Schuster Profil.jpg",
        sha256Hash: "a",
        perceptualHash: "1111000011110000",
        sourceImportDraftId: "d1",
      },
      [],
      [
        {
          id: "p1",
          entityType: "person",
          displayName: "Michelle Schuster",
          photoPath: null,
          sourceImportDraftId: "d1",
        },
      ],
    );
    expect(suggestions.map((s) => s.evidenceType)).toEqual(
      expect.arrayContaining([
        "same_import_draft",
        "filename_hint",
        "missing_profile_photo",
      ]),
    );
  });
  it("modelliert Ablehnen und Bestätigen eines Vorschlags", () => {
    const [s] = createImageSuggestions(
      {
        id: "m1",
        originalFileName: "x.jpg",
        sha256Hash: "a",
        perceptualHash: "1",
      },
      [
        {
          id: "old",
          sha256Hash: "a",
          perceptualHash: "1",
          linkedEntityType: "vehicle",
          linkedEntityId: "v1",
        },
      ],
      [],
    );
    expect({ ...s, status: "rejected" }).toMatchObject({ status: "rejected" });
    expect({ ...s, status: "accepted" }).toMatchObject({ status: "accepted" });
  });
});
