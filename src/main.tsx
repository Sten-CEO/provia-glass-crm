import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeInventoryEventHandlers } from "./lib/inventoryEventHandlers";
import { registerServiceWorker } from "./lib/pwaServiceWorker";
import ErrorBoundary from "./components/ErrorBoundary";
import EnvError from "./components/EnvError";
import { validateEnvVars } from "./integrations/supabase/client";

// Check environment variables before anything else
const envCheck = validateEnvVars();

// Initialize inventory event handlers (only if env is valid)
if (envCheck.valid) {
  initializeInventoryEventHandlers();
}

// Register PWA service worker
registerServiceWorker();

// Render app with error handling
const root = createRoot(document.getElementById("root")!);

if (!envCheck.valid) {
  // Show env error page if variables are missing
  root.render(<EnvError missingVars={envCheck.missing} />);
} else {
  // Normal app render with error boundary
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
