import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import CloudinaryPreview from "./components/CloudinaryPreview";
import CloudinaryUpload from "./pages/CloudinaryUpload";
import { ToastContainer } from "react-toastify";
import "./App.css";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cloudinary-preview" element={<CloudinaryPreview />} /> {/* Test ruta */}
        <Route path="/cloudinary-upload" element={<CloudinaryUpload />} />

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
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        {/* Default preusmeravanje ako ruta ne postoji */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      {/*  ToastContainer: Komponenta za prikaz globalnih toast poruka*/}
      <ToastContainer />
    </Layout>
  );
}

export default App;
