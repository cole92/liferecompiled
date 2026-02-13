import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import ModalPortal from "./ModalPortal";
import Spinner from "../Spinner";
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";

/**
 * @component LikesModal
 * Modalni prikaz korisnika koji su lajkovali komentar.
 *
 * - Prikazuje avatar i ime korisnika koji su lajkovali
 * - Ukljucuje loading stanje i poruku ako nema lajkova
 * - Omogucava "Load more" prikaz za duze liste
 * - Zatvara se klikom na dugme ili ESC/overlay (preko ModalPortal)
 */
const LikesModal = ({
  isOpen,
  onClose,
  users,
  loading,
  visibleCount,
  onLoadMore,
}) => {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} panelClassName="!p-5">
      <h3 className="text-base font-medium mb-4 text-zinc-100">
        People who liked this
      </h3>

      {loading ? (
        <div className="my-8">
          <Spinner />
        </div>
      ) : users.length === 0 ? (
        <p className="text-zinc-400 italic my-8">
          No one has liked this comment yet.
        </p>
      ) : (
        <>
          <ul className="w-full max-h-72 overflow-y-auto">
            {users.slice(0, visibleCount).map((u) => {
              const profileHref = u?.id ? `/profile/${u.id}` : null;

              const rowBase =
                "flex items-center gap-3 p-3 rounded-xl transition " +
                "hover:bg-zinc-900/40 " +
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " +
                "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

              const content = (
                <>
                  <img
                    src={u.profilePicture || DEFAULT_PROFILE_PICTURE}
                    alt={u.name}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                  />
                  <span className="text-zinc-100 font-medium hover:underline underline-offset-4 decoration-zinc-500/70">
                    {u.name}
                  </span>
                </>
              );

              return (
                <li key={u.id ?? u.name}>
                  {profileHref ? (
                    <Link
                      to={profileHref}
                      className={rowBase}
                      onClick={() => onClose?.()}
                      aria-label={`Open profile: ${u.name}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={rowBase}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>

          {visibleCount < users.length && (
            <button
              type="button"
              onClick={onLoadMore}
              className="mt-4 text-sm text-blue-400 hover:text-blue-300 hover:underline"
            >
              Load more
            </button>
          )}
        </>
      )}

      <div className="flex justify-end mt-6">
        <button type="button" onClick={onClose} className="ui-button-primary">
          Close
        </button>
      </div>
    </ModalPortal>
  );
};

LikesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  users: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  visibleCount: PropTypes.number,
  onLoadMore: PropTypes.func,
};

export default LikesModal;
