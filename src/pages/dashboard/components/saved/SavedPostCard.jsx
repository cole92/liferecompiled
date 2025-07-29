import PropTypes from "prop-types";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../context/AuthContext";
import Comments from "../../../../components/comments/Comments";
import { FiLock } from "react-icons/fi";
import ShieldIcon from "../../../../components/ui/ShieldIcon";
import Badge from "../../../../components/ui/Bagde";

const SavedPostCard = ({ post }) => {
  const { user } = useContext(AuthContext);
  const {
    author,
    title,
    category,
    description,
    content,
    createdAt,
    updatedAt,
    locked,
    lockedAt,
    tags,
    id,
  } = post;

  const { name, profilePicture } = author || {};
  const formattedDate = lockedAt?.toDate().toLocaleDateString();
  const navigate = useNavigate();

  const handleClick = () => {
    return navigate(`/post/${post.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`border p-4 rounded shadow bg-white text-black ${
        locked
          ? "opacity-80 grayscale hover:opacity-100 transition duration-200"
          : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative inline-block">
            <img
              src={profilePicture}
              alt={`Avatar of ${name}`}
              className={`w-10 h-10 rounded-full ${
                author.badges?.topContributor ? "ring-2 ring-purple-800" : ""
              }`}
            />
            {author.badges?.topContributor && (
              <div
                title="Top Contributor · Code-powered"
                className="group relative"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <ShieldIcon className="w-5 h-5 absolute -top-12 -right-2 group-hover:scale-110 transition-transform" />
              </div>
            )}
          </div>

          <div
            className="flex gap-1 items-center hover:scale-105"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {post.badges?.mostInspiring && (
              <div title="This post inspired the community">
                <Badge text="Most Inspiring" />
              </div>
            )}

            {post.badges?.trending && (
              <div title="This post is on 🔥">
                <Badge text="Trending" />
              </div>
            )}
          </div>

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
            Locked on: {formattedDate}
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
          {content.slice(0, 300)}
          {content.length > 300 && "..."}
        </p>
      )}

      {/* Category + Tags */}
      <div className="flex flex-wrap items-center gap-2 mt-3 mb-2">
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

      {/* Comment preview (prva 2) */}
      <div className="mt-4">
        <Comments
          postID={id}
          userId={user?.uid}
          showAll={false}
          locked={true} // sakriva formu
          disableBadgeModal={true}
        />
      </div>
    </div>
  );
};

SavedPostCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    category: PropTypes.string,
    description: PropTypes.string,
    content: PropTypes.string,
    createdAt: PropTypes.object, // Firestore Timestamp
    updatedAt: PropTypes.object,
    locked: PropTypes.bool,
    lockedAt: PropTypes.object,
    tags: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
      })
    ),
    author: PropTypes.shape({
      name: PropTypes.string,
      profilePicture: PropTypes.string,
      badges: PropTypes.shape({
        topContributor: PropTypes.bool,
      }),
    }),
    badges: PropTypes.shape({
      mostInspiring: PropTypes.bool,
      trending: PropTypes.bool,
    }),
  }).isRequired,
};

export default SavedPostCard;
