import { useRouteError, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button, EmptyState } from "../ui";

/**
 * A thrown render error during a live pitch is the worst possible failure, so
 * it degrades to something explicable and recoverable rather than a blank
 * screen: say what broke, and offer one button back to the command centre.
 */
export function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();
  const detail =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-j-canvas p-6">
      <EmptyState
        icon={<AlertTriangle />}
        tone="danger"
        title="This screen hit an error"
        description={detail}
        action={
          <Button onClick={() => navigate("/", { replace: true })}>Back to Command Centre</Button>
        }
      />
    </div>
  );
}
