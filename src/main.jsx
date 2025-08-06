import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import AuthProvider from "./context/AuthProvider.jsx";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import "./styles/style.css";

/**
 * Entry point aplikacije.
 *
 * - Omotava App u <BrowserRouter> i <AuthProvider>
 * - Inicijalizuje React root i renderuje aplikaciju
 * - Ucitava globalne stilove i eksterne biblioteke
 */

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
} else {
  console.error("Root element not found!");
}
