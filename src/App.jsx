import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import OrientationGuard from "./components/common/OrientationGuard";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ReportIssue from "./pages/ReportIssue";
import MyPosts from "./pages/MyPosts";
import CreatePost from "./pages/CreatePost";
import EditPost from "./pages/EditPost";
import PostDetails from "./pages/PostDetails";
import Profile from "./pages/Profile";
import About from "./pages/About";

import DashboardLayout from "./pages/dashboard/components/DashboardLayout";
import SavedPosts from "./pages/dashboard/components/saved/SavedPosts";
import Stats from "./pages/dashboard/Stats";
import Trash from "./pages/dashboard/Trash";
import Settings from "./pages/dashboard/settings/Settings";
import ModerationPage from "./pages/dashboard/moderation/ModerationPage";

/**
 * @component App
 *
 * Top-level router + global providers mounted once for the whole app.
 *
 * Why:
 * - Keeps shared shell (`Layout`) and global guards (`OrientationGuard`) consistent across routes.
 * - Centralizes route access control via `ProtectedRoute` (dashboard + user-only pages).
 * - Mounts a single `ToastContainer` to avoid duplicate containers and inconsistent toast behavior.
 *
 * Routing notes:
 * - Public routes: home, auth pages, post details, about.
 * - Protected routes: dashboard subtree + profile/report pages that require auth.
 * - Fallback route redirects unknown paths to `/login` to keep the entry flow predictable.
 *
 * Toast notes:
 * - `limit={2}` + `newestOnTop` reduces toast spam during rapid actions.
 * - Higher `zIndex` ensures toasts stay above modals/sheets.
 *
 * @returns {JSX.Element}
 */
function App() {
  return (
    <Layout>
      <OrientationGuard />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/post/:postId" element={<PostDetails />} />
        <Route path="/about" element={<About />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard/*" element={<DashboardLayout />}>
            <Route index element={<MyPosts />} />
            <Route path="saved" element={<SavedPosts />} />
            <Route path="stats" element={<Stats />} />
            <Route path="trash" element={<Trash />} />
            <Route path="create" element={<CreatePost />} />
            <Route path="edit/:postId" element={<EditPost />} />
            <Route path="moderation" element={<ModerationPage />} />
          </Route>

          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/report" element={<ReportIssue />} />
        </Route>

        {/* Public profile route (view other users) */}
        <Route path="/profile/:uid" element={<Profile />} />

        {/* Unknown routes -> auth entry */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <ToastContainer
        position="top-center"
        theme="dark"
        newestOnTop
        limit={2}
        draggable={false}
        pauseOnFocusLoss={false}
        pauseOnHover={false}
        style={{ zIndex: 120 }}
      />
    </Layout>
  );
}

export default App;
