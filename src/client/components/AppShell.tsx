import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { getCurrentAccount, logout } from "../api/authApi";
import { useInstanceSummary } from "../hooks/useInstanceSummary";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/explore", label: "Explore" },
];

export function AppShell() {
  const instance = useInstanceSummary();
  const navigate = useNavigate();
  const [account, setAccount] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const refreshAccount = () => {
      getCurrentAccount().then(setAccount).catch(() => setAccount(null));
    };
    refreshAccount();
    window.addEventListener("yuragi-auth-change", refreshAccount);
    return () => window.removeEventListener("yuragi-auth-change", refreshAccount);
  }, []);

  async function handleLogout() {
    await logout();
    setAccount(null);
    window.dispatchEvent(new Event("yuragi-auth-change"));
    navigate("/login");
  }

  const accountNavItems =
    account == null
      ? [{ to: "/login", label: "Log in" }]
      : [{ to: `/users/${account.username}`, label: "Profile" }];

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>{instance.name}</span>
        </div>
        <nav className="nav-list">
          {[...navItems, ...accountNavItems].map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
              end={item.to === "/" || item.to === "/login"}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
          {account != null ? (
            <button className="nav-button nav-link" onClick={handleLogout} type="button">
              Log out
            </button>
          ) : null}
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
