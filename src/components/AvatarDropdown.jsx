import { useEffect, useState, useRef } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "../firebase";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import ShieldIcon from "./ui/ShieldIcon";

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

  // Normalize user id (prilagodi ako ti je siguran samo jedan key)
  const userId = user?.uid || user?.id || user?.userId;

  const [isTopContributor, setIsTopContributor] = useState(false);
  const [liveProfilePicture, setLiveProfilePicture] = useState(null);

  // Close menu on route change (kad kliknes link, da ne ostane otvoren)
  useEffect(() => {
    setShowMenu(false);
  }, [location.pathname]);

  // Read Top Contributor from public user doc
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
        const flag = !!data?.badges?.topContributor;
        const pic = data?.profilePicture || null;
        setLiveProfilePicture(pic);
        setIsTopContributor(flag);
      },
      (err) => {
        console.error(
          "AvatarDropdown: failed to read TopContributor badge",
          err
        );
        setIsTopContributor(false);
      }
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

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-haspopup="menu"
        aria-expanded={showMenu}
      >
        <img
          src={
            liveProfilePicture ||
            user?.profilePicture ||
            DEFAULT_PROFILE_PICTURE
          }
          alt="User Avatar"
          className={`w-10 h-10 rounded-full object-cover border-2 border-gray-300 ${
            isTopContributor ? "ring-2 ring-purple-800" : ""
          }`}
        />

        {isTopContributor && (
          <ShieldIcon className="absolute -top-2 -right-1 w-5 h-5 text-purple-800" />
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
            className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
            role="menu"
          >
            <div className="absolute -top-1 right-4 w-3 h-3 bg-white rotate-45 border-l border-t border-gray-200 z-0" />

            <ul className="py-1">
              <li>
                <NavLink
                  to="/dashboard"
                  className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${
                    location.pathname === "/dashboard"
                      ? "bg-gray-100 font-medium"
                      : ""
                  }`}
                >
                  Dashboard
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/profile"
                  className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${
                    location.pathname === "/profile"
                      ? "bg-gray-100 font-medium"
                      : ""
                  }`}
                >
                  Profile Info
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/dashboard/settings"
                  className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${
                    location.pathname === "/dashboard/settings"
                      ? "bg-gray-100 font-medium"
                      : ""
                  }`}
                >
                  Settings
                </NavLink>
              </li>

              <li>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 disabled:opacity-60"
                  onClick={logout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </li>
            </ul>
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
    // badges: PropTypes.shape({ topContributor: PropTypes.bool }), // optional
  }).isRequired,
  logout: PropTypes.func.isRequired,
  isLoggingOut: PropTypes.bool.isRequired,
};

export default AvatarDropdown;
