// src/components/comments/Comments.jsx
import PropTypes from "prop-types";
import { useEffect, useMemo, useState, useCallback } from "react";
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

/**
 * @component Comments
 *
 * Comments list + composer for a post.
 *
 * Supports two data modes:
 * - Controlled: `comments` prop provided by parent (no Firestore subscription here).
 * - Uncontrolled: subscribes to Firestore for the post (`shouldSubscribe`), keeps local state in sync.
 *
 * Key behaviors:
 * - Builds an adjacency list (`childrenMap`) for nested replies.
 * - Hides deleted root comments unless they still have visible (non-deleted) descendants.
 * - "showAll" toggles between compact preview (2 roots) and paged list with "Load more".
 * - Emits a non-deleted count via `onCountChange` for header/badges elsewhere in the UI.
 *
 * @param {string} postID - Current post id.
 * @param {Array<Object>|undefined} comments - Optional externally-provided comments array.
 * @param {boolean} showAll - If false, render a compact preview; if true, render paged list.
 * @param {boolean} locked - If true, disable composing and show archived message.
 * @param {boolean} disableBadgeModal - Prop forwarded to CommentItem for read-only contexts.
 * @param {boolean} renderOnlyForm - Used when parent wants only the composer (no list/header).
 * @param {(count:number)=>void} onCountChange - Notifies parent about non-deleted comment count.
 * @param {boolean} hideHeader - Hide "Comments" header and total.
 * @param {boolean} hideForm - Hide composer even when unlocked.
 * @param {string} formWrapperClassName - Layout hook for composer container.
 * @param {string} listWrapperClassName - Layout hook for list container.
 * @returns {JSX.Element|null}
 */
const Comments = ({
  postID,
  comments: commentsProp,
  showAll = false,
  locked = false,
  disableBadgeModal,
  renderOnlyForm = false,

  onCountChange,
  hideHeader = false,
  hideForm = false,
  formWrapperClassName = "mt-4",
  listWrapperClassName = "mt-5",
}) => {
  const [localComments, setLocalComments] = useState([]);
  const comments = commentsProp ?? localComments;

  const [visibleCount, setVisibleCount] = useState(10);

  // Subscribe only when parent does not supply comments.
  const shouldSubscribe = !commentsProp;

  useEffect(() => {
    // Reset pagination on post change to avoid carrying UI state across routes.
    setVisibleCount(10);
  }, [postID]);

  useEffect(() => {
    if (!postID || !shouldSubscribe) return;

    // Live query: newest first, client builds tree from parentID.
    const qRef = query(
      collection(db, "comments"),
      where("postID", "==", postID),
      orderBy("timestamp", "desc"),
    );

    const unsubscribe = onSnapshot(qRef, (snapshot) => {
      const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLocalComments(results);
    });

    return unsubscribe;
  }, [postID, shouldSubscribe]);

  const childrenMap = useMemo(() => {
    // Adjacency list: parentCommentId -> array of direct child comments.
    const map = {};
    for (const c of comments) {
      const pid = c.parentID ?? null;
      if (!pid) continue;
      if (!map[pid]) map[pid] = [];
      map[pid].push(c);
    }
    return map;
  }, [comments]);

  const rootComments = useMemo(() => {
    // Roots are comments without `parentID`. Sort newest-first for consistent feed ordering.
    const roots = comments.filter((c) => !c.parentID);
    return [...roots].sort((a, b) => {
      const aT =
        a.timestamp?.toMillis?.() || a.timestamp?.toDate?.()?.getTime?.() || 0;
      const bT =
        b.timestamp?.toMillis?.() || b.timestamp?.toDate?.()?.getTime?.() || 0;
      return bT - aT; // newest first
    });
  }, [comments]);

  // Header count: non-deleted only (deleted items remain for thread structure).
  const totalCount = useMemo(
    () => comments.filter((c) => !c.deleted).length,
    [comments],
  );

  useEffect(() => {
    // Lift count to parent (e.g., for tabs/badges) without requiring parent to recompute.
    onCountChange?.(totalCount);
  }, [totalCount, onCountChange]);

  const hasVisibleDescendant = useCallback(
    (id, memo = {}) => {
      // Memoized DFS: checks if a (possibly deleted) root still has visible children.
      // This prevents hiding an entire conversation thread when only the root is deleted.
      if (memo[id] !== undefined) return memo[id];

      const kids = childrenMap?.[id] || [];
      for (const k of kids) {
        if (!k.deleted) {
          memo[id] = true;
          return true;
        }
        if (hasVisibleDescendant(k.id, memo)) {
          memo[id] = true;
          return true;
        }
      }

      memo[id] = false;
      return false;
    },
    [childrenMap],
  );

  const visibleRootComments = useMemo(() => {
    // Deleted roots are hidden unless they still have any visible descendants.
    const memo = {};
    return rootComments.filter(
      (c) => !c.deleted || hasVisibleDescendant(c.id, memo),
    );
  }, [rootComments, hasVisibleDescendant]);

  if (renderOnlyForm) {
    // Composer-only variant for embedded UIs (e.g., sheet/modal).
    return !locked ? (
      <CommentForm
        postId={postID}
        parentId={null}
        wrapperClassName={formWrapperClassName}
      />
    ) : null;
  }

  // Compact view renders only first 2 visible roots; full view uses client-side paging.
  const slice = showAll
    ? visibleRootComments.slice(0, visibleCount)
    : visibleRootComments.slice(0, 2);

  return (
    <div className="w-full">
      {!hideHeader && (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-zinc-100">
              Comments
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">{totalCount} total</p>
          </div>
        </div>
      )}

      {locked && (
        <p className={`${hideHeader ? "" : "mt-2"} text-sm text-zinc-400`}>
          This post is archived. Commenting is disabled.
        </p>
      )}

      {!locked && !hideForm && (
        <CommentForm
          postId={postID}
          parentId={null}
          wrapperClassName={formWrapperClassName}
        />
      )}

      <div className={listWrapperClassName}>
        {slice.length > 0 ? (
          <div className="divide-y divide-zinc-800/80">
            {slice.map((comment) => (
              <CommentItem
                key={comment.id}
                commentId={comment.id}
                userId={comment.userID}
                content={comment.content}
                timestamp={comment.timestamp}
                editedAt={comment.editedAt}
                postID={comment.postID}
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

        {showAll && visibleCount < visibleRootComments.length && (
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="text-sm text-sky-300 hover:text-sky-200 hover:underline underline-offset-4"
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
  comments: PropTypes.array,
  showAll: PropTypes.bool,
  locked: PropTypes.bool,
  disableBadgeModal: PropTypes.bool,
  renderOnlyForm: PropTypes.bool,

  onCountChange: PropTypes.func,
  hideHeader: PropTypes.bool,
  hideForm: PropTypes.bool,
  formWrapperClassName: PropTypes.string,
  listWrapperClassName: PropTypes.string,
};

export default Comments;
