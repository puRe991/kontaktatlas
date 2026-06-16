import { ipcMain, dialog } from "electron";
import { db } from "./localDb";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseProfileText } from "../src/services/profileTextParser";
import { selectedFieldsToPersonInput } from "../src/services/importDraftService";
import { analyzeImageMetadata } from "../src/services/imageAnalysisService";
import { perceptualHashFromBytes } from "../src/services/imageHashService";
import { createImageSuggestions } from "../src/services/smartSuggestionService";

const database = db;
const storageRoot = path.resolve(process.cwd(), "storage");

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
    database.person.create({
      data: {
        ...payload,
        displayName: requireString(payload?.displayName, "Anzeigename"),
      },
    }),
  );
  safe("persons:update", (payload: any) =>
    database.person.update({
      where: { id: requireString(payload?.id, "Person-ID") },
      data: payload.data,
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
    database.vehicle.create({
      data: {
        manufacturer: payload?.manufacturer || undefined,
        model: payload?.model || undefined,
        color: payload?.color || undefined,
        licensePlate: payload?.licensePlateConfirmed
          ? payload.licensePlate
          : undefined,
        vehicleType: payload?.vehicleType || "Auto",
      },
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
    database.relationship.create({
      data: {
        personAId: requireString(payload?.personAId, "Person A"),
        personBId: payload?.personBId || undefined,
        relationshipType: payload?.relationshipType || "unklar",
        direction: payload?.direction || undefined,
        strength: parseRelationshipStrength(payload?.strength),
        confidence: payload?.confidence || "medium",
        description: payload?.description || undefined,
      },
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
    await database.importDraft.update({
      where: { id },
      data: { status: "accepted" },
    });
    return { person, source };
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
    await fs.mkdir(path.join(storageRoot, "images"), { recursive: true });
    const created = [];
    for (const filePath of result.filePaths) {
      const bytes = await fs.readFile(filePath);
      const target = path.join(
        storageRoot,
        "images",
        `${Date.now()}-${path.basename(filePath)}`,
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
  safe("import:json", async () => {
    throw new Error(
      "JSON-Import ist aus Sicherheitsgründen nur nach manueller Datei- und Feldprüfung vorgesehen.",
    );
  });
}
