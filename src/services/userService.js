// services/userService.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

/**
 * @helper makeFallbackAuthor
 *
 * Builds a UI-safe author shape when the user doc is missing, deleted, or not readable.
 *
 * Why:
 * - Prevents UI breakage when author references are stale or access is denied.
 * - Keeps rendering consistent ("Unknown author") without profile links/badges.
 *
 * Rules:
 * - `id = null` is a sentinel: do not use it for navigation/profile routes.
 * - `badges = {}`: do not render badges for fallback authors.
 *
 * @returns {Object} UI-safe fallback author shape.
 */
const makeFallbackAuthor = () => ({
  id: null, // sentinel: no profile -> do not render Link
  name: "Unknown author",
  profilePicture: DEFAULT_PROFILE_PICTURE,
  badges: {}, // do not show badges for fallback authors
  deleted: true,
});

/**
 * @helper normalizeAuthor
 *
 * Normalizes a Firestore user document into the author UI shape.
 *
 * Why:
 * - Ensures required fields exist (`name`, `profilePicture`, `deleted`) for stable rendering.
 * - Adds `uid` as `id` to simplify downstream component usage.
 *
 * Compatibility:
 * - Supports both badge shapes:
 *   1) nested: `badges: { topContributor: true }`
 *   2) legacy: `"badges.topContributor": true`
 *
 * @param {string} uid - User id (document id).
 * @param {Object} data - Raw Firestore user document data.
 * @returns {Object} Normalized author shape.
 */
const normalizeAuthor = (uid, data) => {
  const rawBadges =
    typeof data?.badges === "object" && data.badges ? data.badges : {};

  // Support both shapes:
  // 1) nested: badges: { topContributor: true }
  // 2) legacy literal: "badges.topContributor": true
  const topContributor = Boolean(
    rawBadges.topContributor || data?.["badges.topContributor"],
  );

  return {
    id: uid,
    name: data?.name || "Unknown author",
    profilePicture: data?.profilePicture || DEFAULT_PROFILE_PICTURE,
    badges: {
      ...rawBadges,
      topContributor,
    },
    deleted: false,
  };
};

/**
 * @helper getUserById
 *
 * Fetches an author by id and always returns a UI-safe shape (never throws).
 *
 * Why:
 * - Author data is optional for rendering; a missing/denied user doc should not break pages.
 * - Centralizes fallback logic so callers do not need try/catch + shape guards.
 *
 * Behavior:
 * - Missing `userId` -> fallback author.
 * - Doc not found -> fallback author.
 * - Any error (network/rules/etc.) -> logs and returns fallback.
 *
 * @param {string|null|undefined} userId - Author user id.
 * @returns {Promise<Object>} Normalized author or fallback author.
 */
export const getUserById = async (userId) => {
  try {
    if (!userId) return makeFallbackAuthor();

    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return makeFallbackAuthor();

    return normalizeAuthor(snap.id, snap.data());
  } catch (error) {
    console.error("Error fetching user:", error);
    return makeFallbackAuthor();
  }
};

/**
 * @helper enrichPostWithAuthor
 *
 * Attaches an `author` object to a post and keeps the result UI-safe (never throws).
 *
 * Why:
 * - UI expects `post.author` to exist even when the user doc is missing or deleted.
 * - Keeps post rendering stable without forcing every caller to handle fallback cases.
 *
 * Behavior:
 * - Fetches author via `post.userId`.
 * - Falls back to "Unknown author" if fetching fails for any reason.
 *
 * @param {Object} post - Post object (expects `userId`).
 * @returns {Promise<Object>} Post extended with a safe `author` field.
 */
export const enrichPostWithAuthor = async (post) => {
  try {
    const author = await getUserById(post.userId);

    return {
      ...post,
      author,
    };
  } catch (error) {
    console.error("Author fetch failed in enrichPostWithAuthor:", error);

    return {
      ...post,
      author: makeFallbackAuthor(),
    };
  }
};
