import PropTypes from "prop-types";
import ModalPortal from "./ModalPortal";

/**
 * @component ConfirmModal
 *
 * Reusable confirmation dialog (destructive by default).
 *
 * - Uses `ModalPortal` for ESC/backdrop close + consistent modal layering.
 * - `handleConfirm` awaits `onConfirm` (supports async actions) and then closes via `onCancel`.
 *   This avoids UI closing before the caller finishes its side effects.
 *
 * @param {boolean} isOpen
 * @param {string} title
 * @param {string} message
 * @param {Function} onConfirm - Action to run when user confirms (may be async).
 * @param {Function} onCancel - Close handler (also used after confirm).
 * @param {string=} confirmText
 * @param {string=} confirmButtonClass
 * @param {string=} cancelButtonClass
 * @returns {JSX.Element}
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
}) => {
  const handleConfirm = async () => {
    // Await confirm to keep caller logic consistent (delete/ban/report can be async),
    // then close the modal using the shared cancel handler.
    await Promise.resolve(onConfirm());
    onCancel();
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onCancel}>
      <h2 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h2>
      <p className="text-sm text-zinc-300 mb-4">{message}</p>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className={cancelButtonClass || "ui-button-secondary"}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          className={
            confirmButtonClass ||
            "ui-button bg-rose-600 text-zinc-50 hover:bg-rose-500 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          }
        >
          {confirmText}
        </button>
      </div>
    </ModalPortal>
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
};

export default ConfirmModal;
