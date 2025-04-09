import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase"; // ← ovo je tvoj app iz firebase.js

const functions = getFunctions(app);

export const deleteComment = httpsCallable(functions, "deleteCommentAndChildren");
