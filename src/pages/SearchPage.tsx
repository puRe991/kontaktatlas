import { FormEvent, useState } from "react";
import { Card, ErrorBox } from "../components/common/Ui";
import { api, unwrap } from "../services/apiClient";
export default function SearchPage() {
  const [result, setResult] = useState<any>();
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") || "");
    try {
      setResult(await unwrap(api().search(q)));
    } catch (err: any) {
      setError(err.message);
    }
  }
  return (
    <>
      <h1>Suche</h1>
      <ErrorBox error={error} />
      <Card title="Globale Suche">
        <form className="grid-form" onSubmit={submit}>
          <input
            name="q"
            placeholder="Name, Ort, Fahrzeug, Kennzeichen, Quelle …"
            required
          />
          <button>Suchen</button>
        </form>
        <p className="hint">
          Kennzeichen werden nur gesucht, wenn sie zuvor ausdrücklich
          gespeichert wurden.
        </p>
      </Card>
      {result && (
        <Card title="Suchergebnisse">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </Card>
      )}
    </>
  );
}
