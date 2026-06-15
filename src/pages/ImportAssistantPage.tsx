import { FormEvent, useMemo, useState } from "react";
import { Badge, Card, ErrorBox } from "../components/common/Ui";
import { ParsedProfileText } from "../types/domain";
import { api, unwrap } from "../services/apiClient";
import { parseJsonOrFallback } from "../services/jsonUtils";
export default function ImportAssistantPage() {
  const [draft, setDraft] = useState<any>();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const parsed = useMemo(
    () =>
      draft
        ? parseJsonOrFallback<ParsedProfileText | null>(draft.extractedJson, null)
        : null,
    [draft],
  );
  async function analyze(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const d = await unwrap(
        api().importDrafts.analyze({
          sourceType: fd.get("sourceType"),
          sourceUrl: fd.get("sourceUrl"),
          rawText: fd.get("rawText"),
        }),
      );
      setDraft(d);
      const p = parseJsonOrFallback<ParsedProfileText | null>(
        d.extractedJson,
        null,
      );
      if (!p) {
        setSelected(new Set());
        setError("Entwurf enthält ungültige Analyse-Daten.");
        return;
      }
      setSelected(
        new Set(
          [...p.person, ...p.relationships, ...p.groups, ...p.vehicles]
            .filter((f) => f.selectedByDefault)
            .map((f) => f.id),
        ),
      );
    } catch (err: any) {
      setError(err.message);
    }
  }
  async function accept(all = false) {
    if (!draft || !parsed) return;
    const fields = [
      ...parsed.person,
      ...parsed.relationships,
      ...parsed.groups,
      ...parsed.vehicles,
    ].filter((f) => all || selected.has(f.id));
    try {
      await unwrap(
        api().importDrafts.acceptSelected({
          id: draft.id,
          selectedFields: fields,
        }),
      );
      setError("Übernahme abgeschlossen.");
    } catch (err: any) {
      setError(err.message);
    }
  }
  const fields = parsed
    ? [
        ...parsed.person,
        ...parsed.relationships,
        ...parsed.groups,
        ...parsed.vehicles,
      ]
    : [];
  return (
    <>
      <h1>Import-Assistent</h1>
      <ErrorBox error={error} />
      <Card title="Profiltext manuell einfügen">
        <form onSubmit={analyze} className="stack">
          <select name="sourceType">
            <option>Facebook</option>
            <option>Instagram</option>
            <option>Website</option>
            <option>Kontaktliste</option>
            <option>Sonstiges</option>
          </select>
          <input
            name="sourceUrl"
            placeholder="Profil-Link (optional, wird nicht besucht)"
          />
          <textarea
            name="rawText"
            required
            rows={10}
            placeholder="Kopierter sichtbarer Profiltext"
          />
          <button>Analysieren</button>
        </form>
      </Card>
      {parsed && (
        <Card
          title="Prüfmaske"
          actions={
            <>
              <button onClick={() => accept(false)}>
                Ausgewählte Daten übernehmen
              </button>
              <button onClick={() => accept(true)}>Alles übernehmen</button>
              <button
                onClick={() =>
                  draft &&
                  unwrap(api().importDrafts.discard(draft.id)).then(setDraft)
                }
              >
                Verwerfen
              </button>
              <button
                onClick={() =>
                  draft &&
                  unwrap(api().importDrafts.deleteRawText(draft.id)).then(
                    setDraft,
                  )
                }
              >
                Rohtext löschen
              </button>
            </>
          }
        >
          {fields.map((f) => (
            <label className="review" key={f.id}>
              <input
                type="checkbox"
                checked={selected.has(f.id)}
                onChange={(e) =>
                  setSelected((s) => {
                    const n = new Set(s);
                    e.target.checked ? n.add(f.id) : n.delete(f.id);
                    return n;
                  })
                }
              />
              <strong>
                {f.entity}.{f.fieldName}
              </strong>
              <span>{f.value}</span>
              <Badge tone={f.confidence === "low" ? "warn" : "neutral"}>
                {f.confidence}
              </Badge>
              {f.sensitive && <Badge tone="danger">sensibel</Badge>}
              <small>{f.sourceText}</small>
              {f.warning && <em>{f.warning}</em>}
            </label>
          ))}
          <h3>Fehlende Informationen</h3>
          <ul>
            {parsed.missingInfo.map((m) => (
              <li key={m.fieldName}>{m.message}</li>
            ))}
          </ul>
          <h3>Warnungen</h3>
          <ul>
            {parsed.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
