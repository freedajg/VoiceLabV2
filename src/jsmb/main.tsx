import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./app/App";
import "./jsmb.css";

/**
 * Second Vite entry point, served at /jsmb. Deliberately independent of the
 * VoiceLab app that shares this repo — different root id, different stylesheet,
 * no shared components.
 */
ReactDOM.createRoot(document.getElementById("jsmb-root")!).render(
  <React.StrictMode>
    <App />
    <Toaster position="top-center" richColors closeButton />
  </React.StrictMode>,
);
