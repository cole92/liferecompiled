import { useEffect, useState, useRef } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "../firebase";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import ShieldIcon from "./ui/ShieldIcon";
import Avatar from "./common/Avatar";

import {
  cx,
  FOCUS_RING,
  SURFACE_PANEL,
  SURFACE_PANEL_INNER,
  SURFACE_PANEL_ARROW,
} from "../constants/uiClasses";

/**
 * AvatarDropdown
 */
const AvatarDropdown = ({ user, logout, isLoggingOut }) => {
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const dropdownRef = useRef(null);

  // Normalize user id
  const userId = user?.uid || user?.id || user?.userId;

  const [isTopContributor, setIsTopContributor] = useState(false);
  const [liveProfilePicture, setLiveProfilePicture] = useState(null);

  useEffect(() => {
    setShowMenu(false);
  }, [location.pathname]);

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
        console.error("AvatarDropdown: failed to read user doc", err);
        setIsTopContributor(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

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
      if (showMenu && event.key === "Escape") setShowMenu(false);
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

  const dropdownSurfaceClass = cx(
    SURFACE_PANEL,
    SURFACE_PANEL_INNER,
    "relative",
    "ring-1 ring-sky-200/10",
    "border-sky-500/15",
  );

  const dividerClass = "my-1 border-t border-zinc-800/80";

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
        {/* IMPORTANT: use Avatar so #pos=x,y works everywhere */}
        <Avatar
          src={avatarSrc}
          alt="User Avatar"
          size={40}
          zoomable={false}
          badge={isTopContributor}
        />

        {isTopContributor && (
          <ShieldIcon className="absolute -top-2 -right-1 h-5 w-5 text-amber-300" />
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
            className="absolute right-0 z-50 mt-3.5 w-52 sm:mt-3"
            role="menu"
          >
            <div className={dropdownSurfaceClass}>
              <div className={SURFACE_PANEL_ARROW} />

              <ul className="relative z-10 py-1">
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

                <li aria-hidden="true" className={dividerClass} />

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

                <li className="mt-1 border-t border-zinc-800/80 pt-1">
                  <button
                    type="button"
                    className={cx(
                      "w-full rounded-lg px-4 py-2 text-left text-sm text-zinc-200 transition hover:bg-zinc-900/50 hover:text-zinc-100 disabled:opacity-60",
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
