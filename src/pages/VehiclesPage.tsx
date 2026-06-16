import { FormEvent, useEffect, useState } from "react";
import { Badge, Card, Empty, ErrorBox } from "../components/common/Ui";
import { api, unwrap } from "../services/apiClient";
export default function VehiclesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const load = () =>
    unwrap<any[]>(api().vehicles.list())
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await unwrap(
        api().vehicles.create({
          manufacturer: fd.get("manufacturer"),
          model: fd.get("model"),
          color: fd.get("color"),
          licensePlate: fd.get("licensePlate"),
          licensePlateConfirmed: fd.get("licensePlateConfirmed") === "on",
        }),
      );
      form.reset();
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }
  return (
    <>
      <h1>Fahrzeuge</h1>
      <ErrorBox error={error} />
      <Card title="Fahrzeug anlegen">
        <form className="grid-form" onSubmit={submit}>
          <input name="manufacturer" placeholder="Hersteller" />
          <input name="model" placeholder="Modell" />
          <input name="color" placeholder="Farbe" />
          <input name="licensePlate" placeholder="Kennzeichen (sensibel)" />
          <label className="check">
            <input type="checkbox" name="licensePlateConfirmed" /> Kennzeichen
            ausdrücklich speichern
          </label>
          <button>Anlegen</button>
        </form>
      </Card>
      <Card title="Fahrzeugliste">
        {items.length ? (
          <table>
            <tbody>
              {items.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.manufacturer || "—"} {v.model || ""}
                  </td>
                  <td>{v.color || "—"}</td>
                  <td>
                    <Badge tone="warn">Kennzeichen ausgeblendet</Badge>
                  </td>
                  <td>
                    {!v.photoPath && <Badge>Bild fehlt</Badge>}{" "}
                    {!v.personLinks?.length && (
                      <Badge tone="warn">Zuordnung fehlt</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>Noch keine Fahrzeuge.</Empty>
        )}
      </Card>
    </>
  );
}
