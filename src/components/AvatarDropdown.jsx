import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "../firebase";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import ShieldIcon from "./ui/ShieldIcon";

import {
  cx,
  FOCUS_RING,
  SURFACE_PANEL,
  SURFACE_PANEL_INNER,
  SURFACE_PANEL_ARROW,
  AVATAR_FRAME_BASE,
  AVATAR_RING_DEFAULT,
  AVATAR_RING_TOP,
} from "../constants/uiClasses";

/**
 * @component AvatarDropdown
 *
 * Dropdown menu ispod avatara:
 * - klik na avatar otvara/zatvara meni
 * - ESC i klik van menija zatvaraju meni
 * - Top Contributor status se cita sa servera: users/{uid}.badges.topContributor
 */
const AvatarDropdown = ({ user, logout, isLoggingOut }) => {
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const dropdownRef = useRef(null);

  // Normalize user id
  const userId = user?.uid || user?.id || user?.userId;

  const [isTopContributor, setIsTopContributor] = useState(false);
  const [liveProfilePicture, setLiveProfilePicture] = useState(null);

  // Close menu on route change
  useEffect(() => {
    setShowMenu(false);
  }, [location.pathname]);

  // Read Top Contributor + live profilePicture from public user doc
  useEffect(() => {
    if (!userId) {
      setIsTopContributor(false);
      setLiveProfilePicture(null);
      return;
    }

    const userRef = doc(db, "users", userId);

    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        const data = snap.data();
        setIsTopContributor(!!data?.badges?.topContributor);
        setLiveProfilePicture(data?.profilePicture || null);
      },
      (err) => {
        console.error(
          "AvatarDropdown: failed to read TopContributor badge",
          err,
        );
        setIsTopContributor(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  // Close on outside click + ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showMenu &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    };

    const handleKeyDown = (event) => {
      if (showMenu && event.key === "Escape") {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMenu]);

  const linkBase =
    "block w-full px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50 hover:text-zinc-100 transition " +
    "rounded-lg " +
    FOCUS_RING;

  const linkActive = "bg-zinc-900/60 font-medium text-zinc-100";

  const avatarSrc =
    liveProfilePicture || user?.profilePicture || DEFAULT_PROFILE_PICTURE;

  const avatarClassName = useMemo(() => {
    const ring = isTopContributor ? AVATAR_RING_TOP : AVATAR_RING_DEFAULT;
    return cx("w-10 h-10 rounded-full object-cover", AVATAR_FRAME_BASE, ring);
  }, [isTopContributor]);

  // Subtle premium tint on dropdown surface
  const dropdownSurfaceClass = cx(
    SURFACE_PANEL,
    SURFACE_PANEL_INNER,
    "relative",
    "ring-1 ring-sky-200/10",
    "border-sky-500/15",
  );

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        className={cx("relative flex items-center rounded-full", FOCUS_RING)}
        aria-haspopup="menu"
        aria-expanded={showMenu}
        aria-label="Open user menu"
      >
        <img
          src={avatarSrc}
          alt="User Avatar"
          draggable={false}
          className={avatarClassName}
        />

        {isTopContributor && (
          <ShieldIcon className="absolute -top-2 -right-1 w-5 h-5 text-amber-300" />
        )}
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute right-0 mt-3.5 sm:mt-3 w-52 z-50"
            role="menu"
          >
            <div className={dropdownSurfaceClass}>
              {/* Arrow */}
              <div className={SURFACE_PANEL_ARROW} />

              <ul className="py-1 relative z-10">
                <li>
                  <NavLink
                    to="/dashboard"
                    className={cx(
                      linkBase,
                      location.pathname === "/dashboard" && linkActive,
                    )}
                  >
                    Dashboard
                  </NavLink>
                </li>

                <li>
                  <NavLink
                    to="/profile"
                    className={cx(
                      linkBase,
                      location.pathname === "/profile" && linkActive,
                    )}
                  >
                    Profile Info
                  </NavLink>
                </li>

                <li>
                  <NavLink
                    to="/dashboard/settings"
                    className={cx(
                      linkBase,
                      location.pathname === "/dashboard/settings" && linkActive,
                    )}
                  >
                    Settings
                  </NavLink>
                </li>

                <li>
                  <NavLink
                    to="/report"
                    className={cx(
                      linkBase,
                      location.pathname === "/report" && linkActive,
                    )}
                  >
                    Support & feedback
                  </NavLink>
                </li>

                <li>
                  <NavLink
                    to="/about"
                    className={cx(
                      linkBase,
                      location.pathname === "/about" && linkActive,
                    )}
                  >
                    About
                  </NavLink>
                </li>

                <li className="pt-1 mt-1 border-t border-zinc-800/80">
                  <button
                    type="button"
                    className={cx(
                      "w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50 hover:text-zinc-100 transition rounded-lg disabled:opacity-60",
                      FOCUS_RING,
                    )}
                    onClick={logout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </button>
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

AvatarDropdown.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    id: PropTypes.string,
    userId: PropTypes.string,
    profilePicture: PropTypes.string,
  }).isRequired,
  logout: PropTypes.func.isRequired,
  isLoggingOut: PropTypes.bool.isRequired,
};

export default AvatarDropdown;
