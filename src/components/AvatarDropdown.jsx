import { useEffect, useState, useRef } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import ShieldIcon from "./ui/ShieldIcon";

/**
 * @component AvatarDropdown
 *
 * Meni ispod avatar dugmeta sa opcijama za dashboard, profil i logout.
 *
 * - Klik na avatar otvara padajuci meni
 * - ESC i klik van menija zatvaraju meni
 * - Prikazuje status Top Contributor ako je primenljivo
 *
 * @param {Object} user - Objekat korisnika sa profilnom slikom
 * @param {Function} logout - Funkcija za odjavu
 * @param {boolean} isLoggingOut - Da li je logout u toku
 *
 * @returns {JSX.Element}
 */

const AvatarDropdown = ({ user, logout, isLoggingOut }) => {
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const dropdownRef = useRef(null);

  const isTopContributor = true; // privremeno za test

  // Zatvara meni kada korisnik klikne van njega ili pritisne ESC
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
      {/* Avatar dugme (otvara meni) */}
      <button
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
      >
        <img
          src={user?.profilePicture || DEFAULT_PROFILE_PICTURE}
          alt="User Avatar"
          className={`w-10 h-10 rounded-full object-cover border-2 border-gray-300 ${
            isTopContributor ? "ring-2 ring-purple-800" : ""
          }`}
        />
        {isTopContributor && (
          <ShieldIcon className="absolute -top-2 -right-1 w-5 h-5 text-purple-800" />
        )}
      </button>

      {/* Dropdown meni sa animacijom */}
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
            {/* Vizuelni pokazivac (trokut) */}
            <div className="absolute -top-1 right-4 w-3 h-3 bg-white rotate-45 border-l border-t border-gray-200 z-0" />

            <ul className="py-1">
              {/* Link ka Dashboard-u */}
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

              {/* Link ka Profil stranici */}
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

              {/* Link ka Settings stranici */}
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

              {/* Logout dugme */}
              <li>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
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
    profilePicture: PropTypes.string,
  }).isRequired,
  logout: PropTypes.func.isRequired,
  isLoggingOut: PropTypes.bool.isRequired,
};

export default AvatarDropdown;
