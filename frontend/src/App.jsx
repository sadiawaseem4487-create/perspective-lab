import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import Stage1Agents from "./pages/Stage1Agents";
import Stage2Models from "./pages/Stage2Models";
import Stage3Question from "./pages/Stage3Question";
import Stage4Report from "./pages/Stage4Report";
import Stage5Compare from "./pages/Stage5Compare";
import ComparisonMatrixPage from "./pages/ComparisonMatrixPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/question" replace />} />
        <Route path="agents" element={<Stage1Agents />} />
        <Route path="models" element={<Stage2Models />} />
        <Route path="question" element={<Stage3Question />} />
        <Route path="report" element={<Stage4Report />} />
        <Route path="compare" element={<Stage5Compare />} />
        <Route path="matrix" element={<ComparisonMatrixPage />} />
      </Route>
    </Routes>
  );
}
