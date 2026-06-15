import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import ModalPortal from "./ModalPortal";
import Spinner from "../Spinner";
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";

/**
 * @component LikesModal
 *
 * Modal list of users who liked a comment.
 *
 * UX goals:
 * - Keep the list scannable (avatar + name), with a clear empty/loading state.
 * - Support long lists via "Load more" (client-side pagination via `visibleCount`).
 * - Close on ESC/backdrop via `ModalPortal`, plus explicit Close button.
 *
 * Navigation:
 * - Rows link to user profiles when `u.id` exists.
 * - Clicking a profile closes the modal to avoid stacked navigation + overlay.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Array} users
 * @param {boolean=} loading
 * @param {number=} visibleCount
 * @param {Function=} onLoadMore
 * @returns {JSX.Element}
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
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="!p-0 overflow-hidden"
    >
      <div className="border-b border-zinc-800 px-5 py-4">
        <h3 className="text-base font-semibold text-zinc-100">
          People who liked this
        </h3>
      </div>

      <div className="px-5 py-5">
        {loading ? (
          <div className="my-8">
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <p className="my-8 italic text-zinc-400">
            No one has liked this comment yet.
          </p>
        ) : (
          <>
            <ul className="max-h-72 w-full overflow-y-auto">
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
                      className="h-10 w-10 rounded-full border border-zinc-800 object-cover"
                    />
                    <span className="font-medium text-zinc-100 hover:underline decoration-zinc-500/70 underline-offset-4">
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
      </div>

      <div className="flex justify-end border-t border-zinc-800 px-5 py-4">
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
