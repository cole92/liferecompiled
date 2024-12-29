import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import { ToastContainer } from "react-toastify";
import "./App.css";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Zasticena ruta */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Default preusmeravanje ako ruta ne postoji */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        {/* Zasticena ruta */}
      </Routes>
      {/*  ToastContainer: Komponenta za prikaz globalnih toast poruka*/}
      <ToastContainer />
    </Layout>
  );
}

export default App;
