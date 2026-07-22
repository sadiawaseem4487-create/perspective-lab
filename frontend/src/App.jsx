import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import Stage1Agents from "./pages/Stage1Agents";
import Stage2Models from "./pages/Stage2Models";
import Stage3Question from "./pages/Stage3Question";
import Stage4Report from "./pages/Stage4Report";
import Stage5Compare from "./pages/Stage5Compare";
import ComparisonMatrixPage from "./pages/ComparisonMatrixPage";
import PresentPage from "./pages/PresentPage";
import ExportCenterPage from "./pages/ExportCenterPage";
import FacilitatorGuidePage from "./pages/FacilitatorGuidePage";
import SetupWizardPage from "./pages/SetupWizardPage";
import StudyProtocolPage from "./pages/StudyProtocolPage";

export default function App() {
  return (
    <Routes>
      <Route path="/present" element={<PresentPage />} />
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/question" replace />} />
        <Route path="setup" element={<SetupWizardPage />} />
        <Route path="agents" element={<Stage1Agents />} />
        <Route path="models" element={<Stage2Models />} />
        <Route path="question" element={<Stage3Question />} />
        <Route path="report" element={<Stage4Report />} />
        <Route path="compare" element={<Stage5Compare />} />
        <Route path="study" element={<StudyProtocolPage />} />
        <Route path="matrix" element={<ComparisonMatrixPage />} />
        <Route path="guide" element={<FacilitatorGuidePage />} />
        <Route path="export" element={<ExportCenterPage />} />
      </Route>
    </Routes>
  );
}
