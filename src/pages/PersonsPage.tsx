import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, Empty, ErrorBox } from "../components/common/Ui";
import { api, unwrap } from "../services/apiClient";

const personPayloadFromForm = (form: HTMLFormElement) => {
  const fd = new FormData(form);
  return {
    displayName: String(fd.get("displayName") || "").trim(),
    firstName: String(fd.get("firstName") || "").trim(),
    lastName: String(fd.get("lastName") || "").trim(),
    city: String(fd.get("city") || "").trim(),
  };
};

export default function PersonsPage() {
  const [persons, setPersons] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = () =>
    unwrap<any[]>(api().persons.list())
      .then(setPersons)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await unwrap(api().persons.create(personPayloadFromForm(e.currentTarget)));
      e.currentTarget.reset();
      setError("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }
  async function update(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    try {
      await unwrap(api().persons.update({ id, data: personPayloadFromForm(e.currentTarget) }));
      setEditingId(null);
      setError("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }
  async function remove(person: any) {
    if (!confirm(`Person „${person.displayName}“ wirklich löschen? Verknüpfte Beziehungen und Fahrzeug-Zuordnungen werden entfernt.`)) return;
    try {
      await unwrap(api().persons.delete(person.id));
      setEditingId(null);
      setError("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }
  return (
    <>
      <h1>Personen</h1>
      <ErrorBox error={error} />
      <Card title="Person anlegen">
        <form className="grid-form" onSubmit={submit}>
          <input name="displayName" placeholder="Anzeigename *" required />
          <input name="firstName" placeholder="Vorname" />
          <input name="lastName" placeholder="Nachname" />
          <input name="city" placeholder="Wohnort" />
          <button>Anlegen</button>
        </form>
      </Card>
      <Card title="Personenliste">
        {persons.length ? (
          <table>
            <tbody>
              {persons.map((p) => (
                <tr key={p.id}>
                  {editingId === p.id ? (
                    <td colSpan={5}>
                      <form className="grid-form" onSubmit={(e) => update(e, p.id)}>
                        <input name="displayName" defaultValue={p.displayName} placeholder="Anzeigename *" required />
                        <input name="firstName" defaultValue={p.firstName || ""} placeholder="Vorname" />
                        <input name="lastName" defaultValue={p.lastName || ""} placeholder="Nachname" />
                        <input name="city" defaultValue={p.city || ""} placeholder="Wohnort" />
                        <button>Speichern</button>
                        <button type="button" className="secondary" onClick={() => setEditingId(null)}>Abbrechen</button>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td><Link to={`/persons/${p.id}`}>{p.displayName}</Link></td>
                      <td>{p.city || "—"}</td>
                      <td>{!p.photoPath && <Badge tone="warn">ohne Bild</Badge>}</td>
                      <td>{(p.relationshipsA?.length || 0) + (p.relationshipsB?.length || 0) === 0 && <Badge>ohne Beziehung</Badge>}</td>
                      <td className="row-actions">
                        <button type="button" className="secondary" onClick={() => setEditingId(p.id)}>Bearbeiten</button>
                        <button type="button" className="danger" onClick={() => remove(p)}>Löschen</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>Noch keine Personen.</Empty>}
      </Card>
    </>
  );
}
