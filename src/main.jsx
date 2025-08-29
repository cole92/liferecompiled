import { createRoot } from "react-dom/client";
import "./index.css";
import './styles/style.css'
import App from "./App.jsx";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter } from "react-router-dom";
import AuthProvider from "./context/AuthProvider.jsx";

// Provera postojanja root elementa
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
  console.error("Root element not found!");  // Log greske ako root element ne postoji
}
