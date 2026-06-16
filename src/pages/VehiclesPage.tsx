import { FormEvent, useEffect, useState } from "react";
import { Badge, Card, Empty, ErrorBox } from "../components/common/Ui";
import { api, unwrap } from "../services/apiClient";

const vehiclePayloadFromForm = (form: HTMLFormElement) => {
  const fd = new FormData(form);
  return {
    manufacturer: String(fd.get("manufacturer") || "").trim(),
    model: String(fd.get("model") || "").trim(),
    color: String(fd.get("color") || "").trim(),
    licensePlate: String(fd.get("licensePlate") || "").trim(),
    licensePlateConfirmed: fd.get("licensePlateConfirmed") === "on",
  };
};

export default function VehiclesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
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

    try {
      await unwrap(api().vehicles.create(vehiclePayloadFromForm(form)));
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
        api().vehicles.update({ id, data: vehiclePayloadFromForm(form) }),
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

  async function remove(vehicle: any) {
    const name =
      `${vehicle.manufacturer || ""} ${vehicle.model || ""}`.trim() ||
      "dieses Fahrzeug";

    if (
      !confirm(
        `${name} wirklich löschen? Bestehende Personen-Zuordnungen werden entfernt.`,
      )
    ) {
      return;
    }

    setPendingId(vehicle.id);
    try {
      await unwrap(api().vehicles.delete(vehicle.id));
      setEditingId(null);
      setError("");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPendingId(null);
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
              {items.map((v) => {
                const isBusy = pendingId === v.id;
                return (
                  <tr key={v.id}>
                    {editingId === v.id ? (
                      <td colSpan={5}>
                        <form
                          className="grid-form"
                          onSubmit={(e) => update(e, v.id)}
                        >
                          <input
                            name="manufacturer"
                            defaultValue={v.manufacturer || ""}
                            placeholder="Hersteller"
                          />
                          <input
                            name="model"
                            defaultValue={v.model || ""}
                            placeholder="Modell"
                          />
                          <input
                            name="color"
                            defaultValue={v.color || ""}
                            placeholder="Farbe"
                          />
                          <input
                            name="licensePlate"
                            placeholder="Kennzeichen neu setzen (sensibel)"
                          />
                          <label className="check">
                            <input
                              type="checkbox"
                              name="licensePlateConfirmed"
                            />{" "}
                            Kennzeichen speichern/ersetzen
                          </label>
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
                        <td>
                          {v.manufacturer || "—"} {v.model || ""}
                        </td>
                        <td>{v.color || "—"}</td>
                        <td>
                          <Badge tone="warn">Kennzeichen ausgeblendet</Badge>
                        </td>
                        <td>
                          {!v.photoPath && <Badge>Bild fehlt</Badge>} {" "}
                          {!v.personLinks?.length && (
                            <Badge tone="warn">Zuordnung fehlt</Badge>
                          )}
                        </td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="secondary"
                            disabled={isBusy}
                            onClick={() => setEditingId(v.id)}
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            className="danger"
                            disabled={isBusy}
                            onClick={() => remove(v)}
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
          <Empty>Noch keine Fahrzeuge.</Empty>
        )}
      </Card>
    </>
  );
}
