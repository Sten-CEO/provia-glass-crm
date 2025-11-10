import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeInventoryEventHandlers } from "./lib/inventoryEventHandlers";

// Initialize inventory event handlers
initializeInventoryEventHandlers();

createRoot(document.getElementById("root")!).render(<App />);
