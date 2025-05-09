import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

/**
 * Komponenta za prikaz avatar dugmeta sa padajucim menijem.
 *
 * - Prikazuje profilnu sliku korisnika
 * - Klikom otvara meni sa opcijama: Dashboard, Profil, Logout
 * - Zatvara se klikom van komponente ili pritiskom na ESC
 *
 * @component
 * @param {Object} user - Objekat korisnika sa profilnom slikom
 * @param {Function} logout - Funkcija za odjavu korisnika
 * @param {boolean} isLoggingOut - Da li je u toku proces odjave
 * @returns {JSX.Element} Dropdown meni ispod avatar dugmeta
 */
const AvatarDropdown = ({ user, logout, isLoggingOut }) => {
  const [showMenu, setShowMenu] = useState(false); // Da li je meni otvoren
  const dropdownRef = useRef(null); // Referenca na spoljasnji wrapper radi detekcije klika van komponente

  // Zatvaranje menija klikom van komponente ili pritiskom na ESC
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        showMenu &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    }

    function handleKeyDown(event) {
      if (showMenu && event.key === "Escape") {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMenu]);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {/* Avatar dugme (okidac menija) */}
      <button
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
      >
        <img
          src={user?.profilePicture || DEFAULT_PROFILE_PICTURE}
          alt="User Avatar"
          className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
        />
      </button>

      {/* Dropdown meni sa linkovima */}
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <ul className="py-1">
            <li>
              <a
                href="/dashboard"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Dashboard
              </a>
            </li>
            <li>
              <a
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Profile Info
              </a>
            </li>
            <li>
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={logout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

// Validacija props-a
AvatarDropdown.propTypes = {
  user: PropTypes.shape({
    profilePicture: PropTypes.string,
  }).isRequired,
  logout: PropTypes.func.isRequired,
  isLoggingOut: PropTypes.bool.isRequired,
};

export default AvatarDropdown;
