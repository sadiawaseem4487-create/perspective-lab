import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import { AppModeProvider } from "./context/AppModeContext";
import { WorkflowModeProvider } from "./context/WorkflowModeContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AppModeProvider>
          <WorkflowModeProvider>
            <App />
          </WorkflowModeProvider>
        </AppModeProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
