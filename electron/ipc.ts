import { ipcMain, dialog } from "electron";
import { db } from "./localDb";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { parseProfileText } from "../src/services/profileTextParser";
import {
  ImportAcceptFieldResult,
  ImportAcceptWarning,
  selectedFieldsToGroupInputs,
  selectedFieldsToPersonInput,
  selectedFieldsToRelationshipInputs,
  selectedFieldsToVehicleInputs,
} from "../src/services/importDraftService";
import { analyzeImageMetadata } from "../src/services/imageAnalysisService";
import { perceptualHashFromBytes } from "../src/services/imageHashService";
import { createImageSuggestions } from "../src/services/smartSuggestionService";
import { getAppStoragePaths } from "./storagePaths";

const database = db;

type Handler<T = unknown> = (payload: T) => Promise<unknown> | unknown;

function safe(channel: string, handler: Handler) {
  ipcMain.handle(channel, async (_event, payload) => {
    try {
      return { ok: true, data: await handler(payload) };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      };
    }
  });
}

function json(value: unknown) {
  return JSON.stringify(value ?? null);
}
function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} fehlt.`);
  return value.trim();
}

const DEFAULT_RELATIONSHIP_STRENGTH = 1;
const MIN_RELATIONSHIP_STRENGTH = 1;
const MAX_RELATIONSHIP_STRENGTH = 5;


function optionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function personDataFromPayload(payload: any) {
  return {
    displayName: requireString(payload?.displayName, "Anzeigename"),
    firstName: optionalText(payload?.firstName),
    lastName: optionalText(payload?.lastName),
    city: optionalText(payload?.city),
  };
}

function vehicleDataFromPayload(payload: any) {
  const data: Record<string, unknown> = {
    manufacturer: optionalText(payload?.manufacturer),
    model: optionalText(payload?.model),
    color: optionalText(payload?.color),
    vehicleType: optionalText(payload?.vehicleType) || "Auto",
  };
  if (payload?.licensePlateConfirmed) data.licensePlate = optionalText(payload?.licensePlate);
  return data;
}

function relationshipDataFromPayload(payload: any) {
  return {
    personAId: requireString(payload?.personAId, "Person A"),
    personBId: payload?.personBId || undefined,
    relationshipType: payload?.relationshipType || "unklar",
    direction: payload?.direction || undefined,
    strength: parseRelationshipStrength(payload?.strength),
    confidence: payload?.confidence || "medium",
    description: payload?.description || undefined,
  };
}

function parseRelationshipStrength(value: unknown) {
  if (value === undefined || value === null || value === "")
    return DEFAULT_RELATIONSHIP_STRENGTH;

  const strength =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isFinite(strength))
    throw new Error("Beziehungsstärke muss eine endliche Zahl sein.");

  if (
    strength < MIN_RELATIONSHIP_STRENGTH ||
    strength > MAX_RELATIONSHIP_STRENGTH
  )
    throw new Error(
      `Beziehungsstärke muss zwischen ${MIN_RELATIONSHIP_STRENGTH} und ${MAX_RELATIONSHIP_STRENGTH} liegen.`,
    );

  return strength;
}

async function dashboard() {
  const [
    personsTotal,
    relationshipsTotal,
    vehiclesTotal,
    openImportDrafts,
    persons,
    relationships,
    vehicleLinks,
    openImageAssignments,
    unassignedImages,
  ] = await Promise.all([
    database.person.count({ where: { archived: false } }),
    database.relationship.count(),
    database.vehicle.count({ where: { archived: false } }),
    database.importDraft.count({ where: { status: "draft" } }),
    database.person.findMany({
      include: { relationshipsA: true, relationshipsB: true },
    }),
    database.relationship.findMany(),
    database.vehiclePersonLink.findMany(),
    database.imageSuggestion.count({ where: { status: "pending" } }),
    database.mediaAsset.count({ where: { linkedEntityId: null } }),
  ]);
  return {
    personsTotal,
    relationshipsTotal,
    vehiclesTotal,
    openImportDrafts,
    personsWithMissingInfo: persons.filter(
      (p) => !p.photoPath || !p.birthDate || !p.city,
    ).length,
    personsWithoutRelationships: persons.filter(
      (p) => p.relationshipsA.length + p.relationshipsB.length === 0,
    ).length,
    personsWithoutPhoto: persons.filter((p) => !p.photoPath).length,
    uncertainRelationships: relationships.filter(
      (r) => r.confidence === "low" || r.relationshipType === "unklar",
    ).length,
    vehiclesWithoutAssignment:
      vehiclesTotal - new Set(vehicleLinks.map((l) => l.vehicleId)).size,
    openImageAssignments,
    unassignedImages,
    importDraftsWithOpenMedia: await database.mediaAsset.count({
      where: { purpose: "import_attachment", linkedEntityId: null },
    }),
  };
}

async function createSuggestionsForMedia(
  media: any,
) {
  const [existingMedia, persons, vehicles] = await Promise.all([
    database.mediaAsset.findMany({ where: { NOT: { id: media.id } } }),
    database.person.findMany(),
    database.vehicle.findMany(),
  ]);
  const candidates = [
    ...persons.map((p) => ({
      id: p.id,
      entityType: "person" as const,
      displayName: p.displayName,
      photoPath: p.photoPath,
      sourceUrl: undefined,
      sourceImportDraftId: undefined,
    })),
    ...vehicles.map((v) => ({
      id: v.id,
      entityType: "vehicle" as const,
      displayName: `${v.manufacturer ?? ""} ${v.model ?? ""}`.trim(),
      photoPath: v.photoPath,
      sourceUrl: undefined,
      sourceImportDraftId: undefined,
    })),
  ];
  const drafts = createImageSuggestions(
    media,
    existingMedia.map((m) => ({
      id: m.id,
      sha256Hash: m.sha256Hash,
      perceptualHash: m.perceptualHash,
      linkedEntityType: m.linkedEntityType as "person" | "vehicle" | null,
      linkedEntityId: m.linkedEntityId,
    })),
    candidates,
  );
  for (const draft of drafts)
    await database.imageSuggestion.create({ data: draft });
}

export function registerIpcHandlers() {
  safe("dashboard:get", dashboard);

  safe("persons:list", () =>
    database.person.findMany({
      orderBy: { updatedAt: "desc" },
      include: { relationshipsA: true, relationshipsB: true },
    }),
  );
  safe("persons:get", (id) =>
    database.person.findUnique({
      where: { id: requireString(id, "Person-ID") },
      include: {
        relationshipsA: true,
        relationshipsB: true,
        vehicleLinks: true,
        groups: true,
      },
    }),
  );
  safe("persons:create", (payload: any) =>
    database.person.create({ data: personDataFromPayload(payload) }),
  );
  safe("persons:update", (payload: any) =>
    database.person.update({
      where: { id: requireString(payload?.id, "Person-ID") },
      data: personDataFromPayload(payload?.data),
    }),
  );
  safe("persons:delete", (id) =>
    database.person.delete({ where: { id: requireString(id, "Person-ID") } }),
  );

  safe("vehicles:list", () =>
    database.vehicle.findMany({
      orderBy: { updatedAt: "desc" },
      include: { personLinks: true },
    }),
  );
  safe("vehicles:create", (payload: any) =>
    database.vehicle.create({ data: vehicleDataFromPayload(payload) }),
  );
  safe("vehicles:update", (payload: any) =>
    database.vehicle.update({
      where: { id: requireString(payload?.id, "Fahrzeug-ID") },
      data: vehicleDataFromPayload(payload?.data),
    }),
  );
  safe("vehicles:delete", (id) =>
    database.vehicle.delete({ where: { id: requireString(id, "Fahrzeug-ID") } }),
  );

  safe("relationships:list", () =>
    database.relationship.findMany({
      orderBy: { updatedAt: "desc" },
      include: { personA: true, personB: true },
    }),
  );
  safe("relationships:create", (payload: any) =>
    database.relationship.create({ data: relationshipDataFromPayload(payload) }),
  );
  safe("relationships:update", (payload: any) =>
    database.relationship.update({
      where: { id: requireString(payload?.id, "Beziehungs-ID") },
      data: relationshipDataFromPayload(payload?.data),
    }),
  );
  safe("relationships:delete", (id) =>
    database.relationship.delete({
      where: { id: requireString(id, "Beziehungs-ID") },
    }),
  );

  safe("importDrafts:list", () =>
    database.importDraft.findMany({ orderBy: { updatedAt: "desc" } }),
  );
  safe("importDrafts:analyze", async (payload: any) => {
    const rawText = requireString(payload?.rawText, "Profiltext");
    const parsed = parseProfileText(rawText);
    return database.importDraft.create({
      data: {
        sourceType: payload?.sourceType || "Sonstiges",
        sourceUrl: payload?.sourceUrl || undefined,
        rawText,
        extractedJson: json(parsed),
        missingInfoJson: json(parsed.missingInfo),
        warningsJson: json(parsed.warnings),
        confidence: parsed.confidence,
        status: "draft",
      },
    });
  });
  safe("importDrafts:acceptSelected", async (payload: any) => {
    const id = requireString(payload?.id, "Entwurfs-ID");
    const draft = await database.importDraft.findUnique({ where: { id } });
    if (!draft) throw new Error("Import-Entwurf nicht gefunden.");
    const selected = Array.isArray(payload?.selectedFields)
      ? payload.selectedFields
      : [];
    const personData = selectedFieldsToPersonInput(selected);
    if (!personData.displayName)
      throw new Error(
        "Keine ausgewählten Personendaten mit Anzeigename vorhanden.",
      );
    const source = await database.source.create({
      data: {
        sourceType: draft.sourceType,
        sourceUrl: draft.sourceUrl,
        sourceLabel: "Import-Assistent",
        confidence: draft.confidence,
        originalTextSnippet: (draft.rawText ?? "").slice(0, 500),
      },
    });
    const acceptedFields: ImportAcceptFieldResult[] = [];
    const warnings: ImportAcceptWarning[] = [];
    const createdRelationships = [];
    const createdGroups = [];
    const createdPersonGroupLinks = [];
    const createdVehicles = [];
    const createdVehicleLinks = [];

    const person = await database.person.create({
      data: {
        displayName: personData.displayName,
        firstName: personData.firstName,
        lastName: personData.lastName,
        birthDate: personData.birthDate,
        city: personData.city,
        originCity: personData.originCity,
        role: personData.role,
      },
    });

    for (const field of selected.filter((item: any) => item?.entity === "person")) {
      acceptedFields.push({
        fieldId: field.id,
        entity: "person",
        fieldName: field.fieldName,
        value: field.value,
        status: personData[field.fieldName] ? "accepted" : "skipped",
        message: personData[field.fieldName]
          ? "In den Personen-Datensatz übernommen."
          : "Personenfeld konnte nicht übernommen werden.",
        target: "person",
      });
    }

    for (const relationshipInput of selectedFieldsToRelationshipInputs(selected)) {
      const matchingPersons = await database.person.findMany({
        where: { displayName: relationshipInput.targetName },
      });
      const linkedPerson = matchingPersons.length === 1 ? matchingPersons[0] : null;
      const relationship = await database.relationship.create({
        data: {
          personAId: person.id,
          personBId: linkedPerson?.id,
          relationshipType: relationshipInput.relationshipType,
          confidence: relationshipInput.sourceField.confidence,
          sourceId: source.id,
          description: linkedPerson
            ? undefined
            : `Importierter Zielkontakt: ${relationshipInput.targetName}`,
        },
      });
      createdRelationships.push(relationship);
      acceptedFields.push({
        fieldId: relationshipInput.sourceField.id,
        entity: "relationship",
        fieldName: relationshipInput.sourceField.fieldName,
        value: relationshipInput.sourceField.value,
        status: linkedPerson ? "accepted" : "manual_review",
        message: linkedPerson
          ? "Beziehung angelegt und mit vorhandener Zielperson verknüpft."
          : "Beziehung angelegt, Zielperson aber nicht eindeutig verknüpft. Bitte manuell prüfen.",
        target: "relationship",
      });
      if (!linkedPerson) {
        warnings.push({
          code: matchingPersons.length > 1
            ? "relationship_target_ambiguous"
            : "relationship_target_unresolved",
          entity: "relationship",
          fieldName: relationshipInput.sourceField.fieldName,
          value: relationshipInput.sourceField.value,
          fieldId: relationshipInput.sourceField.id,
          message: matchingPersons.length > 1
            ? "Mehrere vorhandene Personen passen auf den Zielnamen; die Beziehung wurde nicht automatisch verknüpft."
            : "Die Zielperson wurde nur als Text erkannt und nicht automatisch als Person angelegt oder verknüpft.",
        });
      }
    }

    for (const groupInput of selectedFieldsToGroupInputs(selected)) {
      const existingGroups = await database.group.findMany({
        where: { name: groupInput.name },
      });
      const group = existingGroups[0] ?? (await database.group.create({
        data: { name: groupInput.name, sourceId: source.id },
      }));
      const link = await database.personGroupLink.create({
        data: { personId: person.id, groupId: group.id, sourceId: source.id },
      });
      createdGroups.push(group);
      createdPersonGroupLinks.push(link);
      acceptedFields.push({
        fieldId: groupInput.sourceField.id,
        entity: "group",
        fieldName: "name",
        value: groupInput.name,
        status: "accepted",
        message: "Gruppe angelegt bzw. wiederverwendet und mit Person verknüpft.",
        target: "group/personGroupLink",
      });
    }

    for (const vehicleInput of selectedFieldsToVehicleInputs(selected)) {
      const vehicle = await database.vehicle.create({
        data: {
          manufacturer: vehicleInput.manufacturer,
          model: vehicleInput.model,
          color: vehicleInput.color,
          licensePlate: vehicleInput.licensePlate,
          vehicleType: vehicleInput.vehicleType,
          sourceId: source.id,
        },
      });
      const link = await database.vehiclePersonLink.create({
        data: { vehicleId: vehicle.id, personId: person.id, sourceId: source.id },
      });
      createdVehicles.push(vehicle);
      createdVehicleLinks.push(link);
      for (const field of vehicleInput.sourceFields) {
        acceptedFields.push({
          fieldId: field.id,
          entity: "vehicle",
          fieldName: field.fieldName,
          value: field.value,
          status: field.fieldName === "licensePlate" ? "manual_review" : "accepted",
          message: field.fieldName === "licensePlate"
            ? "Kennzeichen übernommen; wegen Sensibilität bitte manuell prüfen."
            : "Fahrzeug angelegt und mit Person verknüpft.",
          target: "vehicle/vehiclePersonLink",
        });
      }
      if (!vehicleInput.manufacturer && !vehicleInput.model) {
        warnings.push({
          code: "vehicle_identity_incomplete",
          entity: "vehicle",
          fieldName: "vehicle",
          value: vehicleInput.licensePlate ?? "",
          message: "Fahrzeug wurde ohne Hersteller/Modell angelegt und benötigt manuelle Prüfung.",
        });
      }
    }

    for (const field of selected) {
      if (acceptedFields.some((accepted) => accepted.fieldId === field.id)) continue;
      warnings.push({
        code: "field_not_mapped",
        entity: field.entity,
        fieldName: field.fieldName,
        value: field.value,
        fieldId: field.id,
        message: "Für dieses Feld existiert kein eindeutiger Import-Mapper.",
      });
      acceptedFields.push({
        fieldId: field.id,
        entity: field.entity,
        fieldName: field.fieldName,
        value: field.value,
        status: "skipped",
        message: "Nicht übernommen; bitte manuell prüfen.",
      });
    }

    await database.importDraft.update({
      where: { id },
      data: { status: "accepted" },
    });
    return {
      person,
      source,
      relationships: createdRelationships,
      groups: createdGroups,
      personGroupLinks: createdPersonGroupLinks,
      vehicles: createdVehicles,
      vehicleLinks: createdVehicleLinks,
      fields: acceptedFields,
      warnings,
    };
  });
  safe("importDrafts:discard", (id) =>
    database.importDraft.update({
      where: { id: requireString(id, "Entwurfs-ID") },
      data: { status: "rejected" },
    }),
  );
  safe("importDrafts:deleteRawText", (id) =>
    database.importDraft.update({
      where: { id: requireString(id, "Entwurfs-ID") },
      data: { rawText: "" },
    }),
  );

  safe("media:list", () =>
    database.mediaAsset.findMany({
      orderBy: { updatedAt: "desc" },
      include: { suggestions: true },
    }),
  );
  safe("media:suggestions", () =>
    database.imageSuggestion.findMany({
      where: { status: "pending" },
      include: { mediaAsset: true },
      orderBy: { createdAt: "desc" },
    }),
  );
  safe("media:import", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Bilder", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
      ],
    });
    if (result.canceled) return [];
    const storagePaths = getAppStoragePaths();
    await fs.mkdir(storagePaths.imagesRoot, { recursive: true });
    const created = [];
    for (const filePath of result.filePaths) {
      const bytes = await fs.readFile(filePath);
      const target = path.join(
        storagePaths.imagesRoot,
        `${Date.now()}-${randomUUID()}-${path.basename(filePath)}`,
      );
      await fs.copyFile(filePath, target);
      const sha256Hash = createHash("sha256").update(bytes).digest("hex");
      const perceptualHash = perceptualHashFromBytes(bytes);
      const mimeType =
        path.extname(filePath).toLowerCase() === ".png"
          ? "image/png"
          : "image/jpeg";
      const analysis = analyzeImageMetadata(
        path.basename(filePath),
        mimeType,
        undefined,
        undefined,
        bytes.byteLength,
      );
      const media = await database.mediaAsset.create({
        data: {
          filePath: target,
          originalFileName: path.basename(filePath),
          mimeType,
          fileSize: bytes.byteLength,
          sha256Hash,
          perceptualHash,
          sourceType: "local_file",
          purpose: "unknown",
          analysisJson: json(analysis),
        },
      });
      await createSuggestionsForMedia(media);
      created.push(media);
    }
    return created;
  });
  safe("media:acceptSuggestion", async (payload: any) => {
    const suggestion = await database.imageSuggestion.findUnique({
      where: { id: requireString(payload?.id, "Vorschlags-ID") },
    });
    if (!suggestion) throw new Error("Vorschlag nicht gefunden.");
    await database.mediaAsset.update({
      where: { id: suggestion.mediaAssetId },
      data: {
        linkedEntityType: suggestion.suggestedEntityType,
        linkedEntityId: suggestion.suggestedEntityId,
      },
    });
    return database.imageSuggestion.update({
      where: { id: suggestion.id },
      data: { status: "accepted" },
    });
  });
  safe("media:rejectSuggestion", (id) =>
    database.imageSuggestion.update({
      where: { id: requireString(id, "Vorschlags-ID") },
      data: { status: "rejected" },
    }),
  );

  safe("media:linkManual", async (payload: any) => {
    const mediaId = requireString(payload?.mediaAssetId, "Medien-ID");
    const linkedEntityType = requireString(
      payload?.linkedEntityType,
      "Zieltyp",
    );
    const linkedEntityId = requireString(payload?.linkedEntityId, "Ziel-ID");
    if (
      !["person", "vehicle", "importDraft", "group"].includes(linkedEntityType)
    )
      throw new Error("Ungültiger Zieltyp.");
    return database.mediaAsset.update({
      where: { id: mediaId },
      data: { linkedEntityType, linkedEntityId },
    });
  });

  safe("media:delete", async (id) => {
    const media = await database.mediaAsset.findUnique({
      where: { id: requireString(id, "Medien-ID") },
    });
    if (!media) throw new Error("Bild nicht gefunden.");
    await database.mediaAsset.delete({ where: { id: media.id } });
    await fs.rm(media.filePath, { force: true });
    return true;
  });

  safe("search:global", async (query) => {
    const q = requireString(query, "Suchbegriff");
    const contains = { contains: q };
    const [persons, vehicles, groups, drafts] = await Promise.all([
      database.person.findMany({
        where: {
          OR: [
            { displayName: contains },
            { nickname: contains },
            { city: contains },
            { originCity: contains },
            { description: contains },
          ],
        },
      }),
      database.vehicle.findMany({
        where: {
          OR: [
            { manufacturer: contains },
            { model: contains },
            { color: contains },
            { licensePlate: contains },
          ],
        },
      }),
      database.group.findMany({
        where: { OR: [{ name: contains }, { description: contains }] },
      }),
      database.importDraft.findMany({
        where: { OR: [{ rawText: contains }, { sourceUrl: contains }] },
      }),
    ]);
    return { persons, vehicles, groups, drafts };
  });
  safe("export:json", async () => ({
    persons: await database.person.findMany(),
    vehicles: await database.vehicle.findMany(),
    relationships: await database.relationship.findMany(),
    importDrafts: await database.importDraft.findMany(),
    mediaAssets: await database.mediaAsset.findMany(),
  }));
  // Intentionally not exposed through the preload API: JSON import remains an
  // internal placeholder until schema allow-listing, referential validation,
  // sensitive-field review, and an explicit preview/confirmation UI exist.
  safe("import:json", async () => {
    throw new Error(
      "JSON-Import ist aus Sicherheitsgründen nur nach manueller Datei- und Feldprüfung vorgesehen.",
    );
  });
}
