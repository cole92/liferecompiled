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
  cancelButtonClass = "bg-gray-300",
  titleClass = "text-lg text-gray-800 font-semibold mb-2",
  messageClass = "text-sm text-gray-600 mb-4",
  containerClass = "bg-white rounded-lg shadow-xl w-full max-w-md p-6",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className={containerClass}>
        <h2 className={titleClass}>{title}</h2>
        <p className={messageClass}>{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className={`px-4 py-1 rounded transition ${cancelButtonClass}`}
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
  cancelButtonClass: PropTypes.string,
  titleClass: PropTypes.string,
  messageClass: PropTypes.string,
  containerClass: PropTypes.string,
};

export default ConfirmModal;
