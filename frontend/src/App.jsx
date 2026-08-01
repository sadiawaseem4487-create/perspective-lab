import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import RequireAuth from "./components/RequireAuth";
import Stage3Question from "./pages/Stage3Question";
import Stage4Report from "./pages/Stage4Report";
import Stage5Compare from "./pages/Stage5Compare";
import ComparisonMatrixPage from "./pages/ComparisonMatrixPage";
import PresentPage from "./pages/PresentPage";
import FacilitatorGuidePage from "./pages/FacilitatorGuidePage";
import SettingsPage from "./pages/SettingsPage";
import GuestInvitePage from "./pages/GuestInvitePage";
import ShareInvitePage from "./pages/ShareInvitePage";
import HistoryPage from "./pages/HistoryPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/invite/:token" element={<GuestInvitePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="settings" element={<SettingsPage />} />
          <Route path="setup" element={<Navigate to="/settings?tab=api" replace />} />
          <Route path="agents" element={<Navigate to="/settings?tab=agents" replace />} />
          <Route path="models" element={<Navigate to="/settings?tab=models" replace />} />
          <Route path="question" element={<Stage3Question />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="report" element={<Stage4Report />} />
          <Route path="compare" element={<Stage5Compare />} />
          <Route path="share" element={<ShareInvitePage />} />
          <Route path="matrix" element={<ComparisonMatrixPage />} />
          <Route path="present" element={<PresentPage />} />
          <Route path="guide" element={<FacilitatorGuidePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
