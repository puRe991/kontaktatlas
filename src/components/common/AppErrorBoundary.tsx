import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card, ErrorBox } from "./Ui";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[kontakt-atlas:renderer] Unerwarteter Renderfehler", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="content app-fallback" role="alert">
        <Card title="KontaktAtlas konnte die Oberfläche nicht laden">
          <ErrorBox error={this.state.error.message || "Unbekannter Renderfehler"} />
          <p className="hint">
            Bitte starte die Anwendung neu. Wenn der Fehler bestehen bleibt,
            prüfe die Entwicklerkonsole oder die Electron-Logs auf die oben
            protokollierte Ursache.
          </p>
          <button onClick={() => window.location.reload()}>Neu laden</button>
        </Card>
      </main>
    );
  }
}
