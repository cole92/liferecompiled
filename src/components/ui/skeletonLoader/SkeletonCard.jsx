/**
 * @component SkeletonCard
 *
 * Visual placeholder displayed while post data is loading.
 * Used in Top 3 and other grid layouts to preserve structure
 * until Firestore data is resolved.
 *
 * - Neutral gray blocks simulate title, description and badges
 * - Uses `animate-pulse` for subtle breathing effect
 * - Prevents layout shift (stable height and spacing during loading)
 *
 * @returns {JSX.Element}
 */
export default function SkeletonCard() {
  return (
    <div className="ui-card p-4 animate-pulse">
      {/* Title placeholder */}
      <div className="h-5 w-2/3 bg-zinc-800/70 rounded mb-2" />

      {/* Description placeholder (2 lines) */}
      <div className="h-4 w-full bg-zinc-800/70 rounded mb-1" />
      <div className="h-4 w-5/6 bg-zinc-800/70 rounded mb-4" />

      {/* Badges placeholder */}
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-zinc-800/70 rounded" />
        <div className="h-5 w-16 bg-zinc-800/70 rounded" />
      </div>

      {/* Counter placeholder */}
      <div className="h-4 w-10 bg-zinc-800/70 rounded mt-3" />
    </div>
  );
}
