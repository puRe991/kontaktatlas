import { CompletenessResult } from "../types/domain";

interface PersonLike {
  id?: string;
  photoPath?: string | null;
  birthDate?: string | null;
  city?: string | null;
  originCity?: string | null;
  sourceId?: string | null;
  relationships?: unknown[];
  openImageSuggestions?: number;
}
interface VehicleLike {
  photoPath?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  color?: string | null;
  licensePlate?: string | null;
  licensePlateConfirmed?: boolean;
  personLinks?: unknown[];
  openImageSuggestions?: number;
}
interface RelationshipLike {
  personBId?: string | null;
  relationshipType?: string | null;
  confidence?: string | null;
  sourceId?: string | null;
}

function buildResult(
  totalChecks: number,
  missing: CompletenessResult["missingInfo"],
  warnings: string[],
  nextSteps: string[],
): CompletenessResult {
  const score = Math.max(
    0,
    Math.round(((totalChecks - missing.length) / totalChecks) * 100),
  );
  return {
    completenessScore: score,
    missingInfo: missing,
    warnings,
    nextSteps,
  };
}

export function checkPersonCompleteness(
  person: PersonLike,
): CompletenessResult {
  const missing: CompletenessResult["missingInfo"] = [];
  const warnings: string[] = [];
  const nextSteps: string[] = [];
  if (!person.photoPath)
    missing.push({
      fieldName: "photoPath",
      message: "Profilbild fehlt.",
      severity: "info",
    });
  if (!person.birthDate)
    missing.push({
      fieldName: "birthDate",
      message: "Geburtstag fehlt.",
      severity: "info",
    });
  if (!person.city)
    missing.push({
      fieldName: "city",
      message: "Wohnort fehlt.",
      severity: "warning",
    });
  if (!person.originCity)
    missing.push({
      fieldName: "originCity",
      message: "Herkunftsort fehlt.",
      severity: "info",
    });
  if (!person.relationships?.length)
    missing.push({
      fieldName: "relationships",
      message: "Beziehungen fehlen.",
      severity: "warning",
    });
  if ((person.openImageSuggestions ?? 0) > 0)
    warnings.push("Offene Bildvorschläge warten auf Prüfung.");
  if (person.birthDate && !/\d{4}/.test(person.birthDate))
    warnings.push("Geburtstag ist unvollständig.");
  nextSteps.push(
    ...missing.slice(0, 3).map((item) => item.message),
    "Quellen prüfen und sensible Felder manuell bestätigen.",
  );
  return buildResult(7, missing, warnings, nextSteps);
}

export function checkVehicleCompleteness(
  vehicle: VehicleLike,
): CompletenessResult {
  const missing: CompletenessResult["missingInfo"] = [];
  const warnings: string[] = [];
  if (!vehicle.photoPath)
    missing.push({
      fieldName: "photoPath",
      message: "Fahrzeugbild fehlt.",
      severity: "info",
    });
  if (!vehicle.manufacturer)
    missing.push({
      fieldName: "manufacturer",
      message: "Hersteller fehlt.",
      severity: "warning",
    });
  if (!vehicle.model)
    missing.push({
      fieldName: "model",
      message: "Modell fehlt.",
      severity: "warning",
    });
  if (!vehicle.color)
    missing.push({
      fieldName: "color",
      message: "Farbe fehlt.",
      severity: "info",
    });
  if (!vehicle.personLinks?.length)
    missing.push({
      fieldName: "personLinks",
      message: "Zuordnung zu Person fehlt.",
      severity: "warning",
    });
  if (vehicle.licensePlate && !vehicle.licensePlateConfirmed)
    warnings.push("Kennzeichen vorhanden, Bestätigung ist nicht dokumentiert.");
  if ((vehicle.openImageSuggestions ?? 0) > 0)
    warnings.push("Offene Bildvorschläge warten auf Prüfung.");
  return buildResult(
    6,
    missing,
    warnings,
    missing.map((item) => item.message),
  );
}

export function checkRelationshipCompleteness(
  rel: RelationshipLike,
): CompletenessResult {
  const missing: CompletenessResult["missingInfo"] = [];
  if (!rel.personBId)
    missing.push({
      fieldName: "personBId",
      message: "Zielperson fehlt.",
      severity: "critical",
    });
  if (!rel.relationshipType || rel.relationshipType === "unklar")
    missing.push({
      fieldName: "relationshipType",
      message: "Beziehungstyp ist unklar.",
      severity: "warning",
    });
  if (rel.confidence === "low")
    missing.push({
      fieldName: "confidence",
      message: "Sicherheit ist niedrig.",
      severity: "warning",
    });
  if (!rel.sourceId)
    missing.push({
      fieldName: "sourceId",
      message: "Quelle fehlt.",
      severity: "info",
    });
  return buildResult(
    4,
    missing,
    [],
    missing.map((item) => item.message),
  );
}
