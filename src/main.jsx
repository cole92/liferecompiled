import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter } from "react-router-dom";
import AuthProvider from "./context/AuthProvider.jsx";

/**
 * App entry point.
 *
 * Why:
 * - Mounts the React tree once and wires global providers in a single place.
 * - Keeps routing (`BrowserRouter`) outside the app shell so all routes share the same history.
 * - Wraps the app with `AuthProvider` so auth state is available across pages and guards.
 */

// Guard against missing mount node (prevents silent runtime failures)
const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>,
  );
} else {
  console.error("Root element not found!");
}
