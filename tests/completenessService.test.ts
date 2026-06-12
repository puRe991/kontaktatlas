import { describe, expect, it } from "vitest";
import {
  checkPersonCompleteness,
  checkRelationshipCompleteness,
  checkVehicleCompleteness,
} from "../src/services/completenessService";

describe("CompletenessService", () => {
  it("meldet Person ohne Profilbild, Geburtstag, Beziehung und offene Bildzuordnung", () => {
    const r = checkPersonCompleteness({
      openImageSuggestions: 1,
      relationships: [],
    });
    expect(r.missingInfo.map((m) => m.fieldName)).toEqual(
      expect.arrayContaining(["photoPath", "birthDate", "relationships"]),
    );
    expect(r.warnings).toHaveLength(1);
  });
  it("meldet Fahrzeug ohne Bild und Zuordnung", () => {
    const r = checkVehicleCompleteness({ personLinks: [] });
    expect(r.missingInfo.map((m) => m.fieldName)).toEqual(
      expect.arrayContaining(["photoPath", "personLinks"]),
    );
  });
  it("meldet Beziehung mit niedriger Sicherheit", () => {
    const r = checkRelationshipCompleteness({
      relationshipType: "unklar",
      confidence: "low",
    });
    expect(r.missingInfo.map((m) => m.fieldName)).toEqual(
      expect.arrayContaining(["confidence", "relationshipType", "personBId"]),
    );
  });
});
