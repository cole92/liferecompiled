import PropTypes from "prop-types";

/**
 * Komponenta koja prikazuje modal za potvrdu akcije (npr. brisanja).
 * Prikazuje se samo ako je `isOpen` true.
 *
 * @param {boolean} isOpen - Da li je modal otvoren
 * @param {string} title - Naslov u modalu
 * @param {string} message - Poruka unutar modala
 * @param {Function} onConfirm - Funkcija koja se poziva kad korisnik potvrdi
 * @param {Function} onCancel - Funkcija koja se poziva kad korisnik otkaze
 * @param {string} confirmText - Tekst za dugme potvrde (default: "Delete")
 * @param {string} confirmButtonClass - Tailwind klasa za dugme potvrde (opciono)
 */

const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  confirmButtonClass = "bg-red-500 hover:bg-red-600",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1 text-white rounded transition ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  confirmText: PropTypes.string,
  confirmButtonClass: PropTypes.string,
};

export default ConfirmModal;
