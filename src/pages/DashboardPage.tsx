import { useEffect, useState } from "react";
import { Card, ErrorBox } from "../components/common/Ui";
import { api, unwrap } from "../services/apiClient";

const labels: Record<string, string> = {
  personsTotal: "Personen gesamt",
  relationshipsTotal: "Beziehungen gesamt",
  vehiclesTotal: "Fahrzeuge gesamt",
  openImportDrafts: "Offene ImportDrafts",
  personsWithMissingInfo: "Personen mit fehlenden Infos",
  personsWithoutRelationships: "Personen ohne Beziehungen",
  personsWithoutPhoto: "Personen ohne Profilbild",
  uncertainRelationships: "Unsichere Beziehungen",
  vehiclesWithoutAssignment: "Fahrzeuge ohne Zuordnung",
  openImageAssignments: "Offene Bildzuordnungen",
  unassignedImages: "Nicht zugeordnete Bilder",
  importDraftsWithOpenMedia: "ImportDrafts mit offenen Medien",
};
export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    unwrap<Record<string, number>>(api().dashboard())
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <h1>Dashboard</h1>
      <ErrorBox error={error} />
      <div className="stats">
        {Object.entries(labels).map(([k, l]) => (
          <Card key={k}>
            <span className="stat">{stats[k] ?? 0}</span>
            <p>{l}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
