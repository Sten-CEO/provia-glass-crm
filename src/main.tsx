import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeInventoryEventHandlers } from "./lib/inventoryEventHandlers";
import { registerServiceWorker } from "./lib/pwaServiceWorker";

// Initialize inventory event handlers
initializeInventoryEventHandlers();

// Register PWA service worker
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
