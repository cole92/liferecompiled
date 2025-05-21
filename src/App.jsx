import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyPosts from "./pages/MyPosts";
import DashboardLayout from "./pages/dashboard/components/DashboardLayout";
import SavedPosts from "./pages/dashboard/SavedPosts";
import Stats from "./pages/dashboard/Stats";
import Trash from "./pages/dashboard/Trash";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import PostDetails from "./pages/PostDetails";
import { ToastContainer } from "react-toastify";
import "./App.css";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/post/:postId" element={<PostDetails />} />
        {/* Zasticene ruta */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard/*" element={<DashboardLayout />}>
            <Route index element={<MyPosts />} />
            <Route path="saved" element={<SavedPosts />} />
            <Route path="stats" element={<Stats />} />
            <Route path="trash" element={<Trash />} />
          </Route>
          <Route path="/dashboard/create-post" element={<CreatePost />} />
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
