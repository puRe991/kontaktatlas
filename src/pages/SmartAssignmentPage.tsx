import { useEffect, useState } from "react";
import { Badge, Card, Empty, ErrorBox } from "../components/common/Ui";
import { api, unwrap } from "../services/apiClient";
export default function SmartAssignmentPage() {
  const [media, setMedia] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [error, setError] = useState("");
  const load = () => {
    unwrap<any[]>(api().media.list())
      .then(setMedia)
      .catch((e) => setError(e.message));
    unwrap<any[]>(api().media.suggestions())
      .then(setSuggestions)
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);
  async function importImages() {
    try {
      await unwrap(api().media.import());
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function accept(id: string) {
    try {
      await unwrap(api().media.acceptSuggestion({ id }));
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function reject(id: string) {
    try {
      await unwrap(api().media.rejectSuggestion(id));
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function manual(mediaAssetId: string, linkedEntityType: string) {
    const linkedEntityId = window.prompt("Ziel-ID eingeben");
    if (!linkedEntityId) return;
    try {
      await unwrap(
        api().media.linkManual({
          mediaAssetId,
          linkedEntityType,
          linkedEntityId,
        }),
      );
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <>
      <h1>Smart-Zuordnung</h1>
      <ErrorBox error={error} />
      <Card
        title="Bildimport"
        actions={<button onClick={importImages}>Bilder auswählen</button>}
      >
        <p>
          Zuordnungen bleiben Vorschläge. Keine Gesichtserkennung, keine
          biometrische Identifikation, keine Kennzeichenerkennung.
        </p>
      </Card>
      <Card title="Nicht zugeordnete Bilder">
        {media.filter((m) => !m.linkedEntityId).length ? (
          media
            .filter((m) => !m.linkedEntityId)
            .map((m) => (
              <div className="media-row" key={m.id}>
                <div>
                  <strong>{m.originalFileName}</strong>
                  <p>
                    {m.mimeType} · {Math.round(m.fileSize / 1024)} KB
                  </p>
                  <Badge>
                    {JSON.parse(m.analysisJson || "{}").probablyScreenshotOrText
                      ? "Screenshot/Text möglich"
                      : "Allgemeine Bilddatei"}
                  </Badge>
                </div>
                <button onClick={() => manual(m.id, "person")}>
                  Zu Person zuordnen
                </button>
                <button onClick={() => manual(m.id, "vehicle")}>
                  Zu Fahrzeug zuordnen
                </button>
                <button onClick={() => manual(m.id, "importDraft")}>
                  Zu ImportDraft zuordnen
                </button>
                <button
                  onClick={() => unwrap(api().media.delete(m.id)).then(load)}
                >
                  Bild löschen
                </button>
              </div>
            ))
        ) : (
          <Empty>Keine unzugeordneten Bilder.</Empty>
        )}
      </Card>
      <Card title="Automatische Vorschläge zur manuellen Prüfung">
        {suggestions.length ? (
          suggestions.map((s) => (
            <div className="suggestion" key={s.id}>
              <strong>{s.reason}</strong>
              <p>
                {s.evidenceType} · Confidence {s.confidence}
              </p>
              <button onClick={() => accept(s.id)}>Vorschlag bestätigen</button>
              <button onClick={() => reject(s.id)}>Vorschlag ablehnen</button>
              <button onClick={() => manual(s.mediaAssetId, "person")}>
                Andere Person wählen
              </button>
              <button onClick={() => manual(s.mediaAssetId, "vehicle")}>
                Zu Fahrzeug zuordnen
              </button>
              <button
                onClick={() =>
                  setError(
                    "Vorschlag übersprungen; er bleibt zur späteren Prüfung offen.",
                  )
                }
              >
                Überspringen
              </button>
            </div>
          ))
        ) : (
          <Empty>Keine offenen Vorschläge.</Empty>
        )}
      </Card>
    </>
  );
}
