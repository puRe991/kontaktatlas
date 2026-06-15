import { useState } from "react";
import { Card, ErrorBox } from "../components/common/Ui";
import { api, unwrap } from "../services/apiClient";
export default function SettingsPage() {
  const [exportData, setExportData] = useState("");
  const [error, setError] = useState("");
  async function exportJson() {
    try {
      setExportData(JSON.stringify(await unwrap(api().exportJson()), null, 2));
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <>
      <h1>Einstellungen</h1>
      <ErrorBox error={error} />
      <Card title="Datenschutz & Grenzen">
        <ul>
          <li>Alle Daten bleiben lokal in der JSON-Datenbank und im storage-Ordner.</li>
          <li>
            Keine Cloud-Synchronisation und keine automatische externe
            Datenübertragung.
          </li>
          <li>
            Keine Gesichtserkennung, keine biometrische Identifikation, keine
            Plattform-Automation.
          </li>
          <li>Sensible Felder werden nicht automatisch vorausgewählt.</li>
        </ul>
      </Card>
      <Card title="Export">
        <button onClick={exportJson}>JSON exportieren</button>
        {exportData && <textarea readOnly rows={12} value={exportData} />}
      </Card>
    </>
  );
}
