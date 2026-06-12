import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge, Card, ErrorBox } from "../components/common/Ui";
import { checkPersonCompleteness } from "../services/completenessService";
import { api, unwrap } from "../services/apiClient";
export default function PersonDetailPage() {
  const { id } = useParams();
  const [person, setPerson] = useState<any>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (id)
      unwrap(api().persons.get(id))
        .then(setPerson)
        .catch((e) => setError(e.message));
  }, [id]);
  if (!person)
    return (
      <>
        <h1>Personendetail</h1>
        <ErrorBox error={error} />
      </>
    );
  const quality = checkPersonCompleteness({
    ...person,
    relationships: [
      ...(person.relationshipsA || []),
      ...(person.relationshipsB || []),
    ],
  });
  return (
    <>
      <h1>{person.displayName}</h1>
      <Card title="Stammdaten">
        <dl>
          <dt>Wohnort</dt>
          <dd>{person.city || "—"}</dd>
          <dt>Herkunft</dt>
          <dd>{person.originCity || "—"}</dd>
          <dt>Geburtstag</dt>
          <dd>{person.birthDate || "—"}</dd>
          <dt>Rolle</dt>
          <dd>{person.role || "—"}</dd>
        </dl>
      </Card>
      <Card title="Datenqualität">
        <div className="quality">
          <strong>{quality.completenessScore}%</strong>
          {quality.missingInfo.map((m) => (
            <Badge
              key={m.fieldName}
              tone={m.severity === "critical" ? "danger" : "warn"}
            >
              {m.message}
            </Badge>
          ))}
        </div>
        <ul>
          {quality.nextSteps.slice(0, 5).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Card>
    </>
  );
}
