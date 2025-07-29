// Paketi
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
// Komponente
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
// Stranice
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyPosts from "./pages/MyPosts";
import CreatePost from "./pages/CreatePost";
import EditPost from "./pages/EditPost";
import PostDetails from "./pages/PostDetails";
import Profile from "./pages/Profile";
// Dashboard stranice
import DashboardLayout from "./pages/dashboard/components/DashboardLayout";
import SavedPosts from "./pages/dashboard/components/saved/SavedPosts";
import Stats from "./pages/dashboard/Stats";
import Trash from "./pages/dashboard/Trash";
import Settings from "./pages/dashboard/settings/Settings";
// Stilovi
import "./App.css";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/post/:postId" element={<PostDetails />} />
        {/* Zasticene rute */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard/*" element={<DashboardLayout />}>
            <Route index element={<MyPosts />} />
            <Route path="saved" element={<SavedPosts />} />
            <Route path="stats" element={<Stats />} />
            <Route path="trash" element={<Trash />} />
            <Route path="create" element={<CreatePost />} />
            <Route path="edit/:postId" element={<EditPost />} />
          </Route>
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/profile/:uid" element={<Profile />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        {/* Default preusmeravanje ako ruta ne postoji */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      {/*  ToastContainer: Komponenta za prikaz globalnih toast poruka*/}
      <ToastContainer />
    </Layout>
  );
}

export default App;
