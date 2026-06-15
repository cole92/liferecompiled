import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import OrientationGuard from "./components/common/OrientationGuard";
import Spinner from "./components/Spinner";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ReportIssue = lazy(() => import("./pages/ReportIssue"));
const MyPosts = lazy(() => import("./pages/MyPosts"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const EditPost = lazy(() => import("./pages/EditPost"));
const PostDetails = lazy(() => import("./pages/PostDetails"));
const Profile = lazy(() => import("./pages/Profile"));
const About = lazy(() => import("./pages/About"));

const DashboardLayout = lazy(
  () => import("./pages/dashboard/components/DashboardLayout"),
);
const SavedPosts = lazy(
  () => import("./pages/dashboard/components/saved/SavedPosts"),
);
const Stats = lazy(() => import("./pages/dashboard/Stats"));
const Trash = lazy(() => import("./pages/dashboard/Trash"));
const Settings = lazy(() => import("./pages/dashboard/settings/Settings"));
const ModerationPage = lazy(
  () => import("./pages/dashboard/moderation/ModerationPage"),
);

const routeFallback = (
  <div className="flex min-h-[45vh] items-center justify-center">
    <Spinner message="Loading..." />
  </div>
);

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

      <Suspense fallback={routeFallback}>
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
      </Suspense>

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
