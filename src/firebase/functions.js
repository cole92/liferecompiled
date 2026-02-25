// commentApi.js

import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

/**
 * Cloud Functions wrappers for comment-related operations.
 *
 * Why wrappers:
 * - Keep UI layers unaware of function names.
 * - Centralize callable definitions (single source of truth).
 * - Allow future instrumentation (logging, retries, metrics) in one place.
 *
 * NOTE:
 * - All validation, auth checks and recursive logic live server-side.
 * - Client only forwards structured input and handles success/error states.
 */

/**
 * @helper deleteComment
 *
 * Calls the Cloud Function that deletes a comment and all its descendants
 * in a single trusted server-side operation.
 *
 * Server guarantees:
 * - Auth + ownership/permission checks
 * - Recursive deletion of child comments
 * - Consistent cleanup (no orphaned replies)
 *
 * @param {{ commentId: string }} data
 * @returns {Promise<{ data: { success: boolean } }>}
 */
export const deleteComment = httpsCallable(
  functions,
  "deleteCommentAndChildren",
);

/**
 * @helper addCommentSecure
 *
 * Calls the Cloud Function responsible for securely creating a comment.
 *
 * Server guarantees:
 * - Auth validation
 * - Input sanitization / length validation
 * - Proper parent-child linkage for threaded replies
 * - Atomic write to Firestore
 *
 * @param {{ postId: string, content: string, parentId?: string|null }} data
 * @returns {Promise<{ data: { success: boolean, commentId: string } }>}
 */
export const addCommentSecure = httpsCallable(functions, "addCommentSecure");
