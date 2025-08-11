import PropTypes from "prop-types";
import CommentForm from "./CommentForm";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import CommentItem from "./CommentItem";

/**
 * @component Comments
 * Rukuje prikazom i real-time osvezavanjem komentara za dati post.
 *
 * - Real-time slusanje Firestore kolekcije `comments` za postID
 * - Prikaz glavnih (root) komentara hronoloski (stariji → noviji)
 * - Opcioni "see more" kada je `showAll` aktivan
 * - Post-responder forma (sakrivena kada je `locked`)
 * - "Samo forma" rezim preko `renderOnlyForm`
 *
 * @param {string}  postID                  - ID posta na koji se komentari odnose
 * @param {string}  [userId]                - ID trenutnog korisnika (moze biti undefined za goste)
 * @param {boolean} [showAll=false]         - Ako je true, primenjuje paginaciju preko `visibleCount`
 * @param {boolean} [locked=false]          - Zakljucava formu i interakcije
 * @param {boolean} [disableBadgeModal]     - Iskljucuje modal za badge u child komponentama
 * @param {number}  [repliesPreviewCount=1] - Koliko odgovora prikazati pre "Show replies"
 * @param {boolean} [renderOnlyForm=false]  - Kada je true, renderuje samo formu (bez liste)
 *
 * @returns {JSX.Element}
 */
const Comments = ({
  postID,
  userId,
  showAll = false,
  locked = false,
  disableBadgeModal,
  repliesPreviewCount = 1,
  renderOnlyForm = false,
}) => {
  const [comments, setComments] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [activeThreadId, setActiveThreadId] = useState(null);

  useEffect(() => {
    if (!postID) return;

    const q = query(
      collection(db, "comments"),
      where("postID", "==", postID),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(results);
    });

    return unsubscribe;
  }, [postID]);

  // Glavni (root) komentari — stariji gore (prirodniji tok citanja)
  const mainComments = useMemo(() => {
    const roots = comments.filter((c) => c.parentID === null);
    return roots.sort((a, b) => {
      const aT =
        a.timestamp?.toMillis?.() || a.timestamp?.toDate?.()?.getTime?.() || 0;
      const bT =
        b.timestamp?.toMillis?.() || b.timestamp?.toDate?.()?.getTime?.() || 0;
      return aT - bT;
    });
  }, [comments]);

  // Samo forma ispod posta (bez liste)
  if (renderOnlyForm) {
    return !locked ? (
      <CommentForm postId={postID} userId={userId} parentId={null} />
    ) : null;
  }

  return (
    <div className="w-full">
      {/* Forma je uvek gore, osim kada je zakljucano */}
      {!locked && (
        <div className="mb-6">
          <CommentForm postId={postID} userId={userId} parentId={null} />
        </div>
      )}

      {/* Lista root komentara sa diskretnim divider-ima */}
      <div>
        {(showAll
          ? mainComments.slice(0, visibleCount)
          : mainComments.slice(0, 2)
        ).map((comment, idx) => (
          <div
            key={comment.id}
            className={idx === 0 ? "" : "border-t border-gray-200 pt-4"}
          >
            {/* Blaga leva vodilja za nit */}
            <div className="pl-2 md:pl-3">
              <CommentItem
                commentId={comment.id}
                userId={comment.userID}
                content={comment.content}
                timestamp={comment.timestamp}
                editedAt={comment.editedAt}
                postID={comment.postID}
                comments={comments}
                showAll={showAll}
                deleted={comment.deleted}
                locked={locked}
                disableBadgeModal={disableBadgeModal}
                repliesPreviewCount={repliesPreviewCount}
                activeThreadId={activeThreadId}
                setActiveThreadId={setActiveThreadId}
              />
            </div>
          </div>
        ))}

        {/* See more */}
        {showAll && visibleCount < mainComments.length && (
          <div className="text-center mt-4">
            <button
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="text-sm text-blue-600 hover:underline"
            >
              See more comments
            </button>
          </div>
        )}

        {/* Zakljucano — info */}
        {locked && mainComments.length === 0 && (
          <p className="text-sm text-gray-500">
            Comments are locked for this post.
          </p>
        )}
      </div>
    </div>
  );
};

Comments.propTypes = {
  postID: PropTypes.string.isRequired,
  userId: PropTypes.string,
  showAll: PropTypes.bool,
  locked: PropTypes.bool,
  disableBadgeModal: PropTypes.bool,
  repliesPreviewCount: PropTypes.number,
  renderOnlyForm: PropTypes.bool,
};

export default Comments;
