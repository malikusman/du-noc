import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { SimProvider } from "./state/sim";
import { EscalationProvider } from "./state/escalation";
import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono/400.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SimProvider>
        <EscalationProvider>
          <App />
          <Toaster position="bottom-right" theme="system" />
        </EscalationProvider>
      </SimProvider>
    </BrowserRouter>
  </React.StrictMode>
);
