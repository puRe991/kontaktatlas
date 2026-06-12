import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, Empty, ErrorBox } from "../components/common/Ui";
import { api, unwrap } from "../services/apiClient";

export default function PersonsPage() {
  const [persons, setPersons] = useState<any[]>([]);
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
    const fd = new FormData(e.currentTarget);
    try {
      await unwrap(
        api().persons.create({
          displayName: String(fd.get("displayName") || ""),
          firstName: String(fd.get("firstName") || ""),
          lastName: String(fd.get("lastName") || ""),
          city: String(fd.get("city") || ""),
        }),
      );
      e.currentTarget.reset();
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
                  <td>
                    <Link to={`/persons/${p.id}`}>{p.displayName}</Link>
                  </td>
                  <td>{p.city || "—"}</td>
                  <td>
                    {!p.photoPath && <Badge tone="warn">ohne Bild</Badge>}
                  </td>
                  <td>
                    {(p.relationshipsA?.length || 0) +
                      (p.relationshipsB?.length || 0) ===
                      0 && <Badge>ohne Beziehung</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>Noch keine Personen.</Empty>
        )}
      </Card>
    </>
  );
}
