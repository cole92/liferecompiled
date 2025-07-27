import { FiLock } from "react-icons/fi";

const SavedPostCard = ({ post }) => {
  const {
    author,
    title,
    category,
    description,
    content,
    createdAt,
    updatedAt,
    locked,
    tags,
  } = post;

  const { name, profilePicture } = author || {};
  const formattedDate = post.lockedAt?.toDate().toLocaleDateString();

  return (
    <div
      className={`border p-4 rounded shadow bg-white text-black ${
        locked
          ? "opacity-80 grayscale hover:opacity-100 transition duration-200"
          : ""
      }`}
    >
      {/* Header: Avatar, ime, datum, lock badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={profilePicture}
            alt={`Avatar of ${name}`}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">{name}</p>
            <p className="text-xs text-gray-500">
              {updatedAt
                ? `Edited: ${updatedAt.toDate().toLocaleDateString()}`
                : `Posted: ${createdAt.toDate().toLocaleDateString()}`}
            </p>
          </div>
        </div>

        {locked && (
          <span
            className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
            title="This post is locked and cannot be edited or commented"
          >
            <FiLock className="text-sm" />
            {formattedDate}
          </span>
        )}
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold mb-2">{title}</h2>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-700 mb-2">{description}</p>
      )}

      {/* Content */}
      {content && (
        <p className="text-sm text-gray-800 mb-3 whitespace-pre-line">
          {content}
        </p>
      )}

      {/* Category + Tags */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
          {category}
        </span>

        {tags.map((tag, index) => (
          <span
            key={index}
            className="bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded"
          >
            #{tag.text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SavedPostCard;
