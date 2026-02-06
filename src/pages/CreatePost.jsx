import { useContext, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { showSuccessToast, showErrorToast } from "../utils/toastUtils";

import Spinner from "../components/Spinner";
import PostEditorForm from "../components/PostEditorForm";

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard");
  };

  const handleCreate = async (postData) => {
    if (!user) {
      showErrorToast("You must be logged in to create a post.");
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedTitle = postData.title.toLowerCase().trim();

      const docRef = await addDoc(collection(db, "posts"), {
        ...postData,
        title_lc: normalizedTitle,
        userId: user.uid,
        createdAt: serverTimestamp(),
        deleted: false,
        deletedAt: null,
        updatedAt: null,
        locked: false,
      });

      showSuccessToast("Post successfully created!");
      navigate(`/post/${docRef.id}`);
    } catch (error) {
      console.error("Error creating post:", error);
      showErrorToast("Error creating post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return <Spinner message="Loading user info..." />;

  return (
    <div className="ui-shell py-6 sm:py-8">
      <div className="ui-card relative overflow-hidden p-5 sm:p-6 mb-6">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative">
          <h1 className="text-3xl font-semibold text-zinc-100">
            Create a New Post
          </h1>
          <p className="mt-1 text-sm text-zinc-300">
            Share something useful with the community.
          </p>
        </div>
      </div>

      <PostEditorForm
        mode="create"
        initialValues={{
          title: "",
          description: "",
          content: "",
          category: "",
          tags: [],
        }}
        isSubmitting={isSubmitting}
        onSubmit={handleCreate}
        onCancel={handleCancel}
        submitLabel="Save Post"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default CreatePost;
