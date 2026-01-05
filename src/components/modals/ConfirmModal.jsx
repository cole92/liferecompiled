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
 * @param {string} [confirmButtonClass] - Optional custom klase za Confirm dugme
 * @param {string} [cancelButtonClass] - Optional custom klase za Cancel dugme
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
  confirmButtonClass,
  cancelButtonClass,
}) => (
  <ModalPortal isOpen={isOpen} onClose={onCancel}>
    <div className="ui-card p-5">
      {/* Naslov modala */}
      <h2 className="text-lg text-zinc-100 font-semibold mb-2">{title}</h2>

      {/* Poruka modala */}
      <p className="text-sm text-zinc-300 mb-4">{message}</p>

      {/* Dugmad za Cancel i Confirm */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className={cancelButtonClass || "ui-button-secondary"}
        >
          Cancel
        </button>

        <button
          onClick={() => {
            onConfirm();
            onCancel();
          }}
          className={
            confirmButtonClass ||
            "ui-button bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          }
        >
          {confirmText}
        </button>
      </div>
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
  confirmButtonClass: PropTypes.string,
  cancelButtonClass: PropTypes.string,
};

export default ConfirmModal;
