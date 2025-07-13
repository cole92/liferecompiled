import PropTypes from "prop-types";
import ModalPortal from "./ModalPortal";

/**
 * @component ConfirmModal
 * Modal za potvrdu kriticnih akcija (brisanje, zakljucavanje itd.).
 *
 * - Prikazuje naslov, poruku, i dva dugmeta: Cancel i Confirm
 * - Poziva odgovarajuce callback funkcije (onConfirm, onCancel)
 * - Koristi ModalPortal za prikaz izvan DOM stabla
 * - ESC i klik van prozora zatvaraju modal automatski
 *
 * @param {boolean} isOpen - Da li je modal trenutno otvoren
 * @param {string} title - Naslov koji se prikazuje u modalu
 * @param {string} message - Poruka koja objasnjava akciju
 * @param {Function} onConfirm - Callback koji se poziva pri potvrdi
 * @param {Function} onCancel - Callback koji se poziva pri zatvaranju
 * @param {string} [confirmText="Delete"] - Tekst koji se prikazuje na dugmetu potvrde
 *
 * @returns {JSX.Element} Modal sa konfirmacionim akcijama
 */

const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
}) => (
  <ModalPortal isOpen={isOpen} onClose={onCancel}>
    {/* Naslov modala */}
    <h2 className="text-lg text-gray-800 font-semibold mb-2">{title}</h2>

    {/* Poruka modala */}
    <p className="text-sm text-gray-600 mb-4">{message}</p>

    {/* Dugmad za Cancel i Confirm */}
    <div className="flex justify-end gap-3">
      <button
        onClick={onCancel}
        className="px-4 py-1 bg-gray-300 rounded hover:bg-gray-400 transition"
      >
        Cancel
      </button>
      <button
        onClick={() => {
          onConfirm();
          onCancel();
        }}
        className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
      >
        {confirmText}
      </button>
    </div>
  </ModalPortal>
);

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  confirmText: PropTypes.string,
};

export default ConfirmModal;
