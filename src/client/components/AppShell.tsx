import { Button, Layout, Menu, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { getCurrentAccount, logout } from "../api/client";
import { useInstanceSummary } from "../hooks/useInstanceSummary";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/explore", label: "Explore" },
];

export function AppShell() {
  const instance = useInstanceSummary();
  const location = useLocation();
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

  const accountNavItem =
    account == null
      ? { to: "/login", label: "Log in" }
      : { to: `/users/${account.username}`, label: "Profile" };
  const menuItems = [...navItems, accountNavItem].map((item) => ({
    key: item.to,
    label: <NavLink to={item.to}>{item.label}</NavLink>,
  }));

  return (
    <Layout className="app-shell">
      <Layout.Sider breakpoint="lg" collapsedWidth="0" theme="light" width={256}>
        <Space direction="vertical" size="large" style={{ display: "flex", padding: 24 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {instance.name}
          </Typography.Title>
          <Menu
            items={menuItems}
            mode="inline"
            selectedKeys={[location.pathname]}
          />
          {account != null ? (
            <Button block onClick={() => void handleLogout()} type="text">
              Log out
            </Button>
          ) : null}
        </Space>
      </Layout.Sider>
      <Layout.Content className="content">
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
