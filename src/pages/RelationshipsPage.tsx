import { FormEvent, useEffect, useState } from "react";
import { Badge, Card, Empty, ErrorBox } from "../components/common/Ui";
import { api, unwrap } from "../services/apiClient";
export default function RelationshipsPage() {
  const [rels, setRels] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
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
    const fd = new FormData(e.currentTarget);
    try {
      await unwrap(api().relationships.create(Object.fromEntries(fd)));
      e.currentTarget.reset();
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }
  return (
    <>
      <h1>Beziehungen</h1>
      <ErrorBox error={error} />
      <Card title="Beziehung anlegen">
        <form className="grid-form" onSubmit={submit}>
          <select name="personAId" required>
            <option value="">Person A</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
          <select name="personBId">
            <option value="">Zielperson offen lassen</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
          <select name="relationshipType">
            <option>kennt</option>
            <option>Familie</option>
            <option>Freundschaft</option>
            <option>Arbeit</option>
            <option>Nachbar</option>
            <option>Verein</option>
            <option>Feuerwehr</option>
            <option>Facebook-Freund</option>
            <option>ehemaliger Kontakt</option>
            <option>sonstiges</option>
            <option>unklar</option>
          </select>
          <select name="confidence">
            <option>medium</option>
            <option>high</option>
            <option>low</option>
          </select>
          <button>Anlegen</button>
        </form>
      </Card>
      <Card title="Beziehungsübersicht">
        {rels.length ? (
          <table>
            <tbody>
              {rels.map((r) => (
                <tr key={r.id}>
                  <td>{r.personA?.displayName}</td>
                  <td>{r.relationshipType}</td>
                  <td>
                    {r.personB?.displayName || (
                      <Badge tone="warn">Ziel offen</Badge>
                    )}
                  </td>
                  <td>{r.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>Noch keine Beziehungen.</Empty>
        )}
      </Card>
    </>
  );
}
