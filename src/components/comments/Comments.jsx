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

const Comments = ({
  postID,
  userId,
  showAll = false,
  locked = false,
  disableBadgeModal,
  repliesPreviewCount = 1, // 1 = Reddit-like: prikaži prvi odgovor pa Show replies
  renderOnlyForm = false, // kada je true: renderuj samo formu (za blok ispod posta)
}) => {
  const [comments, setComments] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10); // malo veći default

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

  // Glavni komentari – najstariji gore (prirodniji tok)
  const mainComments = useMemo(() => {
    const roots = comments.filter((c) => c.parentID === null);
    // stariji -> noviji
    return roots.sort((a, b) => {
      const aT =
        a.timestamp?.toMillis?.() || a.timestamp?.toDate?.()?.getTime?.() || 0;
      const bT =
        b.timestamp?.toMillis?.() || b.timestamp?.toDate?.()?.getTime?.() || 0;
      return aT - bT;
    });
  }, [comments]);

  // Samo forma (za prvi blok ispod posta)
  if (renderOnlyForm) {
    return (
      !locked && <CommentForm postId={postID} userId={userId} parentId={null} />
    );
  }

  return (
    <div className="w-full">
      {/* Forma uvek GORE (osim ako je locked) */}
      {!locked && (
        <div className="mb-6">
          <CommentForm postId={postID} userId={userId} parentId={null} />
        </div>
      )}

      {/* Lista komentara – bez kartice, sa diskretnim divider-ima */}
      <div>
        {(showAll
          ? mainComments.slice(0, visibleCount)
          : mainComments.slice(0, 2)
        ).map((comment, idx) => (
          <div
            key={comment.id}
            className={idx === 0 ? "" : "border-t border-gray-200 pt-4"}
          >
            {/* leva nit za koren (samo malo vizuelno) */}
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

        {/* Zaključano – info */}
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
