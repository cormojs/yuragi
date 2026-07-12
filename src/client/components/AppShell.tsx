import { NavLink, Outlet } from "react-router";
import { useInstanceSummary } from "../hooks/useInstanceSummary";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/explore", label: "Explore" },
  { to: "/users/yuragi", label: "Profile" },
];

export function AppShell() {
  const instance = useInstanceSummary();

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>{instance.name}</span>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
              end={item.to === "/"}
              key={item.to}
              to={item.to}
            >
              {item.label}
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
