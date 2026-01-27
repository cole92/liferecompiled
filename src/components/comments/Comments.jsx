import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";

import { db } from "../../firebase";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";

const Comments = ({
  postID,
  userId, // kept for compatibility (not used here)
  showAll = false,
  locked = false,
  disableBadgeModal,
  repliesPreviewCount = 1, // kept for compatibility (not used in this UX)
  renderOnlyForm = false,
}) => {
  const [comments, setComments] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (!postID) return;

    const q = query(
      collection(db, "comments"),
      where("postID", "==", postID),
      orderBy("timestamp", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setComments(results);
    });

    return unsubscribe;
  }, [postID]);

  const childrenMap = useMemo(() => {
    const map = {};
    for (const c of comments) {
      const pid = c.parentID ?? null;
      if (!pid) continue;
      if (!map[pid]) map[pid] = [];
      map[pid].push(c);
    }
    return map;
  }, [comments]);

  const totalCount = useMemo(() => {
    // count only non-deleted (root + replies)
    return comments.filter((c) => !c.deleted).length;
  }, [comments]);

  const rootComments = useMemo(() => {
    const roots = comments.filter((c) => !c.parentID);

    const keepThread = (c) => {
      if (!c.deleted) return true;
      const kids = childrenMap?.[c.id] || [];
      return kids.some((k) => !k.deleted);
    };

    return roots.filter(keepThread).sort((a, b) => {
      const aT =
        a.timestamp?.toMillis?.() || a.timestamp?.toDate?.()?.getTime?.() || 0;
      const bT =
        b.timestamp?.toMillis?.() || b.timestamp?.toDate?.()?.getTime?.() || 0;
      return bT - aT; // newest first
    });
  }, [comments, childrenMap]);

  if (renderOnlyForm) {
    return !locked ? (
      <CommentForm postId={postID} parentId={null} wrapperClassName="mt-4" />
    ) : null;
  }

  const slice = showAll
    ? rootComments.slice(0, visibleCount)
    : rootComments.slice(0, 2);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100">
          Comments
        </h2>
        <span className="text-sm text-zinc-400">{totalCount}</span>
      </div>

      {locked && (
        <p className="mt-2 text-sm text-zinc-400">
          This post is archived. Commenting is disabled.
        </p>
      )}

      {!locked && (
        <CommentForm postId={postID} parentId={null} wrapperClassName="mt-4" />
      )}

      {/* List */}
      <div className="mt-5">
        {slice.length > 0 ? (
          <div className="divide-y divide-zinc-800/70">
            {slice.map((comment) => (
              <CommentItem
                key={comment.id}
                commentId={comment.id}
                userId={comment.userID}
                content={comment.content}
                timestamp={comment.timestamp}
                editedAt={comment.editedAt}
                postID={comment.postID}
                comments={comments}
                childrenMap={childrenMap}
                showAll={showAll}
                deleted={comment.deleted}
                locked={locked}
                disableBadgeModal={disableBadgeModal}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 italic">
            {locked ? "No comments." : "Be the first to comment."}
          </p>
        )}

        {showAll && visibleCount < rootComments.length && (
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="text-sm text-sky-300 hover:text-sky-200 hover:underline"
            >
              Load more
            </button>
          </div>
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
