import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "./components/AppShell";
import { ExplorePage } from "./pages/ExplorePage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProfileSettingsPage } from "./pages/ProfileSettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/users/:identifier" element={<ProfilePage />} />
        <Route path="/settings/profile" element={<ProfileSettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
