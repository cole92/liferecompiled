import { createRoot } from "react-dom/client";
import "./index.css";
import './styles/style.css'
import App from "./App.jsx";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter } from "react-router-dom";
import AuthProvider from "./context/AuthProvider.jsx";

createRoot(document.getElementById("root")).render(
  <AuthProvider>  {/* AuthProvider obuhvata celu aplikaciju i obezbeđuje globalni kontekst za pracenje korisnika i autentifikaciju */}
    <BrowserRouter>   {/* BrowserRouter omogucava navigaciju izmedju razlicitih ruta aplikacije */}
      <App />
    </BrowserRouter>
  </AuthProvider>
);
