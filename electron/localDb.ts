import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getAppStoragePaths } from "./storagePaths";

type Row = Record<string, any>;
type Store = Record<string, Row[]>;

type FindOptions = {
  where?: any;
  orderBy?: Record<string, "asc" | "desc">;
  include?: Record<string, boolean>;
};

const modelKeys = [
  "person",
  "relationship",
  "vehicle",
  "vehiclePersonLink",
  "group",
  "personGroupLink",
  "source",
  "importDraft",
  "mediaAsset",
  "imageSuggestion",
  "missingInfoHint",
] as const;

type ModelKey = (typeof modelKeys)[number];

const plural: Record<ModelKey, string> = {
  person: "persons",
  relationship: "relationships",
  vehicle: "vehicles",
  vehiclePersonLink: "vehiclePersonLinks",
  group: "groups",
  personGroupLink: "personGroupLinks",
  source: "sources",
  importDraft: "importDrafts",
  mediaAsset: "mediaAssets",
  imageSuggestion: "imageSuggestions",
  missingInfoHint: "missingInfoHints",
};

function emptyStore(): Store {
  return Object.fromEntries(modelKeys.map((key) => [plural[key], []]));
}

function now() {
  return new Date().toISOString();
}

function newId() {
  return `ka_${randomUUID().replace(/-/g, "")}`;
}

function isPlainObject(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeData(data: Row = {}) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
}

function matchesWhere(row: Row, where?: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;
  if (Array.isArray(where.OR)) return where.OR.some((item: any) => matchesWhere(row, item));
  if (where.NOT) return !matchesWhere(row, where.NOT);

  return Object.entries(where).every(([key, expected]) => {
    const actual = row[key];
    if (isPlainObject(expected)) {
      if ("contains" in expected) {
        const needle = String(expected.contains ?? "").toLowerCase();
        return String(actual ?? "").toLowerCase().includes(needle);
      }
      if ("not" in expected) return actual !== expected.not;
      return matchesWhere(actual ?? {}, expected);
    }
    return actual === expected;
  });
}

function sortRows(rows: Row[], orderBy?: FindOptions["orderBy"]) {
  if (!orderBy) return rows;
  const [[field, direction]] = Object.entries(orderBy);
  return [...rows].sort((a, b) => {
    const left = a[field] ?? "";
    const right = b[field] ?? "";
    if (left === right) return 0;
    const result = left > right ? 1 : -1;
    return direction === "desc" ? -result : result;
  });
}

class LocalDatabase {
  private store: Store = emptyStore();
  private ready: Promise<void>;
  private writeQueue = Promise.resolve();

  constructor() {
    this.ready = this.load();
  }

  model(key: ModelKey) {
    return new LocalModel(this, key, plural[key]);
  }

  async rows(collection: string) {
    await this.ready;
    return this.store[collection] ?? [];
  }

  async mutate<T>(operation: () => T | Promise<T>) {
    await this.ready;
    const result = await operation();
    this.writeQueue = this.writeQueue.then(() => this.save());
    await this.writeQueue;
    return result;
  }

  async include(row: Row, include?: FindOptions["include"]) {
    if (!include) return { ...row };
    const result = { ...row };
    if (include.relationshipsA) result.relationshipsA = (await this.rows("relationships")).filter((r) => r.personAId === row.id);
    if (include.relationshipsB) result.relationshipsB = (await this.rows("relationships")).filter((r) => r.personBId === row.id);
    if (include.vehicleLinks || include.personLinks) {
      const links = await this.rows("vehiclePersonLinks");
      if (include.vehicleLinks) result.vehicleLinks = links.filter((l) => l.personId === row.id);
      if (include.personLinks) result.personLinks = links.filter((l) => l.vehicleId === row.id);
    }
    if (include.groups) result.groups = (await this.rows("personGroupLinks")).filter((l) => l.personId === row.id);
    if (include.personA) result.personA = (await this.rows("persons")).find((p) => p.id === row.personAId) ?? null;
    if (include.personB) result.personB = (await this.rows("persons")).find((p) => p.id === row.personBId) ?? null;
    if (include.suggestions) result.suggestions = (await this.rows("imageSuggestions")).filter((s) => s.mediaAssetId === row.id);
    if (include.mediaAsset) result.mediaAsset = (await this.rows("mediaAssets")).find((m) => m.id === row.mediaAssetId) ?? null;
    return result;
  }

  private async load() {
    const paths = getAppStoragePaths();
    await fs.mkdir(paths.imagesRoot, { recursive: true });
    await fs.mkdir(paths.importsRoot, { recursive: true });
    try {
      const parsed = JSON.parse(await fs.readFile(paths.databaseFile, "utf8"));
      this.store = { ...emptyStore(), ...(isPlainObject(parsed) ? parsed : {}) };
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        const backup = `${paths.databaseFile}.invalid-${Date.now()}`;
        await fs.rename(paths.databaseFile, backup).catch(() => undefined);
        console.error(`[kontakt-atlas:db] Ungültige JSON-Datenbank wurde nach ${backup} verschoben.`);
      }
      this.store = emptyStore();
      await this.save();
    }
  }

  private async save() {
    const paths = getAppStoragePaths();
    await fs.mkdir(paths.storageRoot, { recursive: true });
    const tmp = `${paths.databaseFile}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(this.store, null, 2)}\n`, "utf8");
    await fs.rename(tmp, paths.databaseFile);
  }
}

class LocalModel {
  constructor(
    private db: LocalDatabase,
    private key: ModelKey,
    private collection: string,
  ) {}

  async findMany(options: FindOptions = {}) {
    const rows = sortRows((await this.db.rows(this.collection)).filter((row) => matchesWhere(row, options.where)), options.orderBy);
    return Promise.all(rows.map((row) => this.db.include(row, options.include)));
  }

  async findUnique(options: { where: { id: string }; include?: FindOptions["include"] }) {
    const row = (await this.db.rows(this.collection)).find((item) => item.id === options.where.id);
    return row ? this.db.include(row, options.include) : null;
  }

  async count(options: Pick<FindOptions, "where"> = {}) {
    return (await this.db.rows(this.collection)).filter((row) => matchesWhere(row, options.where)).length;
  }

  async create(options: { data: Row }) {
    return this.db.mutate(async () => {
      const timestamp = now();
      const row = {
        id: newId(),
        ...this.defaults(),
        ...normalizeData(options.data),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      (await this.db.rows(this.collection)).push(row);
      return { ...row };
    });
  }

  async update(options: { where: { id: string }; data: Row }) {
    return this.db.mutate(async () => {
      const rows = await this.db.rows(this.collection);
      const index = rows.findIndex((row) => row.id === options.where.id);
      if (index === -1) throw new Error("Datensatz nicht gefunden.");
      rows[index] = { ...rows[index], ...normalizeData(options.data), updatedAt: now() };
      return { ...rows[index] };
    });
  }

  async delete(options: { where: { id: string } }) {
    return this.db.mutate(async () => {
      const rows = await this.db.rows(this.collection);
      const index = rows.findIndex((row) => row.id === options.where.id);
      if (index === -1) throw new Error("Datensatz nicht gefunden.");
      const [deleted] = rows.splice(index, 1);
      await this.cascadeDelete(options.where.id);
      return { ...deleted };
    });
  }

  private defaults() {
    if (this.key === "person" || this.key === "vehicle") return { archived: false };
    if (this.key === "importDraft") return { status: "draft" };
    if (this.key === "imageSuggestion") return { status: "pending" };
    if (this.key === "missingInfoHint") return { resolved: false };
    return {};
  }

  private async cascadeDelete(id: string) {
    if (this.key === "person") {
      const rel = await this.db.rows("relationships");
      for (let i = rel.length - 1; i >= 0; i -= 1) if (rel[i].personAId === id || rel[i].personBId === id) rel.splice(i, 1);
      const links = await this.db.rows("vehiclePersonLinks");
      for (let i = links.length - 1; i >= 0; i -= 1) if (links[i].personId === id) links.splice(i, 1);
    }
    if (this.key === "vehicle") {
      const links = await this.db.rows("vehiclePersonLinks");
      for (let i = links.length - 1; i >= 0; i -= 1) if (links[i].vehicleId === id) links.splice(i, 1);
    }
    if (this.key === "mediaAsset") {
      const suggestions = await this.db.rows("imageSuggestions");
      for (let i = suggestions.length - 1; i >= 0; i -= 1) if (suggestions[i].mediaAssetId === id) suggestions.splice(i, 1);
    }
  }
}

const database = new LocalDatabase();

export const db = Object.fromEntries(modelKeys.map((key) => [key, database.model(key)])) as Record<ModelKey, LocalModel>;
