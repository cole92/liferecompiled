import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase";
import { AuthContext } from "../../../context/AuthContext";
import { useState, useEffect, useContext, useMemo } from "react";
import { Link } from "react-router-dom";

import EditProfileForm from "./EditProfileForm";
import Avatar from "../../../components/common/Avatar";
import { SkeletonLine } from "../../../components/ui/skeletonLoader/SkeletonBits";
import EmptyState from "../components/EmptyState";
import { DEFAULT_PROFILE_PICTURE } from "../../../constants/defaults";

/**
 * @component Settings
 *
 * Profile settings page with two responsibilities:
 * - Load the current user's `users/{uid}` doc from Firestore (once per uid).
 * - Render `EditProfileForm` only when data is ready, while keeping UX stable (skeleton/empty/error).
 *
 * Notes:
 * - Uses a small `status` state machine to avoid scattered boolean flags.
 * - Uses a `canceled` guard to prevent state updates after unmount / uid switch.
 *
 * @returns {JSX.Element}
 */
const Settings = () => {
  const { user, isCheckingAuth } = useContext(AuthContext);

  // Keep uid derived in one place so effects stay consistent.
  const uid = user?.uid || null;

  const [userData, setUserData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | empty | error
  const [errorMsg, setErrorMsg] = useState("");
  const [showFullBio, setShowFullBio] = useState(false);

  const linkBase =
    "font-semibold text-zinc-100 hover:text-zinc-100 " +
    "hover:underline underline-offset-4 decoration-zinc-500/70 " +
    "transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-md";

  // Solid settings surface; keeps the private editor calm and distinct from public profile.
  const feedCardSkin =
    "overflow-hidden border-zinc-800 bg-zinc-950";

  useEffect(() => {
    // UI-only state: reset expanded bio when switching user or when bio changes.
    setShowFullBio(false);
  }, [uid, userData?.bio]);

  useEffect(() => {
    // Do not fetch until auth check is done (prevents flicker / wrong state on first load).
    if (isCheckingAuth) return;

    // Logged out: treat as empty settings state (no Firestore call).
    if (!uid) {
      setUserData(null);
      setStatus("empty");
      setErrorMsg("");
      return;
    }

    let canceled = false;

    const fetchUserData = async () => {
      setStatus("loading");
      setErrorMsg("");

      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (canceled) return;

        if (snap.exists()) {
          // Keep id in the payload for profile routes and child form writes.
          setUserData({ id: snap.id, ...snap.data() });
          setStatus("ready");
        } else {
          setUserData(null);
          setStatus("empty");
        }
      } catch (error) {
        if (canceled) return;
        console.error("Error fetching user data:", error);

        setUserData(null);
        setStatus("error");
        setErrorMsg("We couldn't load your settings. Please try again later.");
      }
    };

    fetchUserData();

    // Cleanup prevents setState on unmounted component and avoids race on uid changes.
    return () => {
      canceled = true;
    };
  }, [uid, isCheckingAuth]);

  // Prefer Firestore doc id when available; fallback to auth uid for stable linking.
  const viewProfileId = userData?.id || uid || "";
  const displayName = userData?.name || user?.displayName || "Your profile";
  const bio = (userData?.bio || "").trim();

  const shortBio = useMemo(() => {
    // Keep preview text deterministic and avoid layout jumps on long bios.
    if (!bio) return "";
    const max = 140;
    return bio.length > max ? bio.slice(0, max).trimEnd() + "..." : bio;
  }, [bio]);

  // During auth bootstrap, avoid rendering intermediate UI states.
  if (isCheckingAuth) return null;

  return (
    <div className="w-full px-2 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl my-5 sm:my-8">
        <header className="mb-5 sm:mb-6 pb-5 border-b border-zinc-800/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
            Private workspace
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100">
            Settings
          </h1>
          <p className="mt-1 text-sm sm:text-base text-zinc-400">
            Manage your public profile and account details.
          </p>
        </header>

        <div className="grid gap-4 lg:gap-8 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
          {/* LEFT COLUMN (on mobile goes below) */}
          <aside className="space-y-5 lg:sticky lg:top-24 self-start order-2 lg:order-1">
            <div className={`ui-card ${feedCardSkin} p-3 sm:p-5`}>
              <h2 className="text-base font-semibold text-zinc-100">
                Profile preview
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                This is what people see across the app.
              </p>

              {status === "loading" ? (
                <div className="mt-5 space-y-3">
                  {/* Skeleton keeps the panel stable while Firestore resolves. */}
                  <SkeletonLine w="w-2/3" h="h-4" />
                  <SkeletonLine w="w-full" h="h-3" />
                  <SkeletonLine w="w-5/6" h="h-3" />
                  <SkeletonLine w="w-1/2" h="h-4" />
                </div>
              ) : (
                <div className="mt-5">
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={userData?.profilePicture || DEFAULT_PROFILE_PICTURE}
                      size={56}
                      zoomable={false}
                      alt="Profile preview picture"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-zinc-100">
                        {displayName}
                      </div>

                      <p className="mt-0.5 text-xs text-zinc-500">
                        Public author identity
                      </p>
                    </div>
                  </div>

                  {bio ? (
                    <div className="mt-1 text-sm text-zinc-400">
                      {showFullBio ? (
                        // When expanded, cap height on large screens to avoid pushing the form too far down.
                        <div className="break-words whitespace-pre-wrap lg:max-h-28 lg:overflow-y-auto lg:pr-2 ui-scrollbar">
                          {bio}
                        </div>
                      ) : (
                        <div className="break-words">{shortBio}</div>
                      )}

                      {bio.length > 140 && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setShowFullBio((v) => !v)}
                            className={linkBase}
                          >
                            {showFullBio ? "Show less" : "Show full bio"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-zinc-500">
                      Add a short bio to help others recognize you.
                    </div>
                  )}

                  {!!viewProfileId && (
                    <div className="mt-4 border-t border-zinc-800 pt-4">
                      <Link
                        to={`/profile/${viewProfileId}`}
                        className={linkBase}
                      >
                        View public profile
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={`ui-card ${feedCardSkin} p-3 sm:p-6`}>
              <h2 className="text-base font-semibold text-zinc-100">Account</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Read-only details from authentication.
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="grid gap-1 sm:flex sm:items-center sm:justify-between sm:gap-3">
                  <span className="text-zinc-500">Email</span>
                  <span className="min-w-0 truncate text-zinc-200">
                    {user?.email || "—"}
                  </span>
                </div>

                <div className="grid gap-1 sm:flex sm:items-center sm:justify-between sm:gap-3">
                  <span className="text-zinc-500">User ID</span>
                  <span className="text-zinc-200">
                    {uid ? `${uid.slice(0, 8)}...` : "—"}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap gap-3">
                <Link to="/dashboard" className={linkBase}>
                  Back to dashboard
                </Link>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN (on mobile goes first) */}
          <section className="space-y-4 order-1 lg:order-2 lg:space-y-6">
            <div className={`ui-card ${feedCardSkin} p-3 sm:p-6`}>
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-zinc-100">
                  Edit profile
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Update your name, bio and profile picture.
                </p>
              </div>

              {status === "loading" && (
                <div className="mx-auto mt-2 space-y-2 max-w-xl">
                  {/* Keep form area calm while the doc loads (matches preview panel). */}
                  <SkeletonLine w="w-1/2" h="h-6" />
                  <SkeletonLine w="w-full" h="h-4" />
                  <SkeletonLine w="w-5/6" h="h-4" />
                  <SkeletonLine w="w-2/3" h="h-4" />
                </div>
              )}

              {status === "ready" && userData && (
                <EditProfileForm userData={userData} />
              )}

              {status === "empty" && (
                <EmptyState
                  title="Settings unavailable"
                  description="We couldn't find profile settings for this account."
                  surface={false}
                />
              )}

              {status === "error" && (
                <EmptyState
                  title="Settings could not be loaded"
                  description={errorMsg}
                  surface={false}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
