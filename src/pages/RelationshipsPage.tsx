import { FormEvent, useEffect, useState } from "react";
import { Badge, Card, Empty, ErrorBox } from "../components/common/Ui";
import { api, unwrap } from "../services/apiClient";

const relationshipTypes = [
  "kennt",
  "Familie",
  "Freundschaft",
  "Arbeit",
  "Nachbar",
  "Verein",
  "Feuerwehr",
  "Facebook-Freund",
  "ehemaliger Kontakt",
  "sonstiges",
  "unklar",
];
const confidenceLevels = ["medium", "high", "low"];

const relationshipPayloadFromForm = (form: HTMLFormElement) =>
  Object.fromEntries(new FormData(form));

export default function RelationshipsPage() {
  const [rels, setRels] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    unwrap<any[]>(api().relationships.list())
      .then(setRels)
      .catch((e) => setError(e.message));
    unwrap<any[]>(api().persons.list())
      .then(setPersons)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    try {
      await unwrap(api().relationships.create(relationshipPayloadFromForm(form)));
      form.reset();
      setError("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function update(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const form = e.currentTarget;
    setPendingId(id);

    try {
      await unwrap(
        api().relationships.update({
          id,
          data: relationshipPayloadFromForm(form),
        }),
      );
      setEditingId(null);
      setError("");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  async function remove(rel: any) {
    const label = `${rel.personA?.displayName || "Unbekannt"} → ${
      rel.personB?.displayName || "Ziel offen"
    }`;

    if (!confirm(`Beziehung „${label}“ wirklich löschen?`)) return;

    setPendingId(rel.id);
    try {
      await unwrap(api().relationships.delete(rel.id));
      setEditingId(null);
      setError("");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  const personOptions = persons.map((p) => (
    <option key={p.id} value={p.id}>
      {p.displayName}
    </option>
  ));
  const typeOptions = relationshipTypes.map((type) => (
    <option key={type} value={type}>
      {type}
    </option>
  ));
  const confidenceOptions = confidenceLevels.map((level) => (
    <option key={level} value={level}>
      {level}
    </option>
  ));

  return (
    <>
      <h1>Beziehungen</h1>
      <ErrorBox error={error} />
      <Card title="Beziehung anlegen">
        <form className="grid-form" onSubmit={submit}>
          <select name="personAId" required>
            <option value="">Person A</option>
            {personOptions}
          </select>
          <select name="personBId">
            <option value="">Zielperson offen lassen</option>
            {personOptions}
          </select>
          <select name="relationshipType">{typeOptions}</select>
          <select name="confidence">{confidenceOptions}</select>
          <button>Anlegen</button>
        </form>
      </Card>
      <Card title="Beziehungsübersicht">
        {rels.length ? (
          <table>
            <tbody>
              {rels.map((r) => {
                const isBusy = pendingId === r.id;
                return (
                  <tr key={r.id}>
                    {editingId === r.id ? (
                      <td colSpan={5}>
                        <form
                          className="grid-form"
                          onSubmit={(e) => update(e, r.id)}
                        >
                          <select
                            name="personAId"
                            defaultValue={r.personAId}
                            required
                          >
                            <option value="">Person A</option>
                            {personOptions}
                          </select>
                          <select
                            name="personBId"
                            defaultValue={r.personBId || ""}
                          >
                            <option value="">Zielperson offen lassen</option>
                            {personOptions}
                          </select>
                          <select
                            name="relationshipType"
                            defaultValue={r.relationshipType || "unklar"}
                          >
                            {typeOptions}
                          </select>
                          <select
                            name="confidence"
                            defaultValue={r.confidence || "medium"}
                          >
                            {confidenceOptions}
                          </select>
                          <button disabled={isBusy}>Speichern</button>
                          <button
                            type="button"
                            className="secondary"
                            disabled={isBusy}
                            onClick={() => setEditingId(null)}
                          >
                            Abbrechen
                          </button>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td>{r.personA?.displayName}</td>
                        <td>{r.relationshipType}</td>
                        <td>
                          {r.personB?.displayName || (
                            <Badge tone="warn">Ziel offen</Badge>
                          )}
                        </td>
                        <td>{r.confidence}</td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="secondary"
                            disabled={isBusy}
                            onClick={() => setEditingId(r.id)}
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            className="danger"
                            disabled={isBusy}
                            onClick={() => remove(r)}
                          >
                            Löschen
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Empty>Noch keine Beziehungen.</Empty>
        )}
      </Card>
    </>
  );
}
