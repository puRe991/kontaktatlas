import { NavLink, Outlet } from "react-router-dom";

const nav = [
  ["/", "Dashboard"],
  ["/persons", "Personen"],
  ["/relationships", "Beziehungen"],
  ["/vehicles", "Fahrzeuge"],
  ["/groups", "Gruppen"],
  ["/import", "Import-Assistent"],
  ["/smart-assignment", "Smart-Zuordnung"],
  ["/graph", "Netzwerk"],
  ["/search", "Suche"],
  ["/settings", "Einstellungen"],
];

export function AppShell() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          KontaktAtlas<span>Lokal · Privat · Manuell</span>
        </div>
        <nav>
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
