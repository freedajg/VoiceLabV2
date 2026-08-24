import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useUiStore } from "../store/uiStore";
import { disposeAgentRuntime } from "../store/agentStore";

export default function App() {
  const brand = useUiStore((s) => s.brand);

  // The CSS token sets are selected by data-brand on <html>, which is what the
  // white-label switch flips. Kept in sync here so a brand chosen before first
  // paint (or restored by the store) still applies.
  useEffect(() => {
    document.documentElement.dataset.brand = brand;
  }, [brand]);

  // Tear every scenario timer down if the app itself unmounts.
  useEffect(() => disposeAgentRuntime, []);

  return <RouterProvider router={router} />;
}
