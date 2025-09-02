import { createPortal } from "react-dom";
import { useEffect } from "react";
import PropTypes from "prop-types";

/**
 * @component ModalPortal
 * Omotac za sve modalne prozore — renderuje sadrzaj izvan glavnog DOM stabla preko React Portala.
 *
 * - Zakljucava skrolovanje tela dok je modal otvoren
 * - Zatvara se na ESC taster
 * - Klik van modala (na overlay) takodje zatvara modal
 * - Renderuje se unutar #modal-root elementa (ili kao fallback u document.body)
 *
 * @param {boolean} isOpen - Da li je modal trenutno prikazan
 * @param {Function} onClose - Funkcija koja zatvara modal
 * @param {ReactNode} children - Sadrzaj koji ce biti prikazan unutar modala
 *
 * @returns {JSX.Element|null} Portal sa modalom ili null ako nije prikazan
 */

export default function ModalPortal({
  isOpen,
  onClose,
  children,
  backdropClassName = "bg-black/80",
  contentClassName = "bg-amber-100 border-[3px] border-amber-700 rounded-xl shadow-xl p-6 max-w-xl w-full",
}) {
  // Zakljucava skrol tela dok je modal otvoren
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = original);
  }, [isOpen]);

  // Zatvara modal kada korisnik pritisne ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Ako modal nije otvoren — ne renderujemo nista
  if (!isOpen) return null;

  // Portal render modala unutar #modal-root
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${backdropClassName}`}
      onClick={onClose}
    >
      <div
        className={contentClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}

ModalPortal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};
