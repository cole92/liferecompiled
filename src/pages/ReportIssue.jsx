// src/pages/ReportIssue.jsx
import { useContext, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../utils/toastUtils";

const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL || "support@example.com";

function buildMailto({ to, subject, body }) {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return `mailto:${to}?subject=${s}&body=${b}`;
}

function buildGmailComposeUrl({ to, subject, body }) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

const ReportIssue = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const [type, setType] = useState("Bug");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [steps, setSteps] = useState("");

  const meta = useMemo(() => {
    const now = new Date().toISOString();
    return {
      time: now,
      route: location.pathname,
      url: window.location.href,
      uid: user?.uid ?? "guest",
      email: user?.email ?? "unknown",
      ua: navigator.userAgent,
    };
  }, [location.pathname, user?.uid, user?.email]);

  const subject = useMemo(() => {
    const t = title.trim() || "No title";
    return `[${type}] ${t} (route: ${meta.route})`;
  }, [type, title, meta.route]);

  const composedBody = useMemo(() => {
    return [
      `Type: ${type}`,
      `Title: ${title.trim() || "-"}`,
      "",
      "Details:",
      details.trim() || "-",
      "",
      "Steps to reproduce:",
      steps.trim() || "-",
      "",
      "---- Debug ----",
      `Time: ${meta.time}`,
      `Route: ${meta.route}`,
      `URL: ${meta.url}`,
      `User UID: ${meta.uid}`,
      `User Email: ${meta.email}`,
      `User Agent: ${meta.ua}`,
    ].join("\n");
  }, [type, title, details, steps, meta]);

  const mailtoHref = useMemo(() => {
    return buildMailto({ to: SUPPORT_EMAIL, subject, body: composedBody });
  }, [subject, composedBody]);

  const gmailHref = useMemo(() => {
    return buildGmailComposeUrl({
      to: SUPPORT_EMAIL,
      subject,
      body: composedBody,
    });
  }, [subject, composedBody]);

  const validateRequired = () => {
    if (!title.trim() || !details.trim()) {
      showErrorToast("Please enter title and details.", {
        toastId: "report-required",
      });
      return false;
    }
    return true;
  };

  const handleOpenEmailApp = () => {
    if (!validateRequired()) return;

    try {
      window.location.href = mailtoHref;
      showSuccessToast("Opening your email app...", {
        toastId: "report-open-mailto",
      });
    } catch (err) {
      void err;
      showInfoToast("Could not open email app. Use Gmail or Copy.", {
        toastId: "report-mailto-fail",
      });
    }
  };

  const handleOpenGmail = () => {
    if (!validateRequired()) return;

    const win = window.open(gmailHref, "_blank", "noopener,noreferrer");
    if (!win) {
      showInfoToast("Popup blocked. Use Copy report instead.", {
        toastId: "report-popup-blocked",
      });
      return;
    }

    showSuccessToast("Opening Gmail in a new tab...", {
      toastId: "report-open-gmail",
    });
  };

  const handleCopy = async () => {
    if (!validateRequired()) return;

    const payload = [
      `To: ${SUPPORT_EMAIL}`,
      `Subject: ${subject}`,
      "",
      composedBody,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(payload);
      showSuccessToast("Report copied to clipboard.", {
        toastId: "report-copied",
      });
    } catch (err) {
      void err;
      showErrorToast("Could not copy. Please select and copy manually.", {
        toastId: "report-copy-fail",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="ui-card p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-zinc-100">
          Report an issue
        </h2>
        <p className="mt-1 text-sm text-zinc-300">
          Send us what you saw. Basic debug info is included automatically.
        </p>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="ui-label" htmlFor="report-type">
              Type
            </label>
            <select
              id="report-type"
              className="ui-input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option>Bug</option>
              <option>Feedback</option>
              <option>UI issue</option>
              <option>Performance</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="ui-label" htmlFor="report-title">
              Title
            </label>
            <input
              id="report-title"
              className="ui-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <label className="ui-label" htmlFor="report-details">
              Details
            </label>
            <textarea
              id="report-details"
              className="ui-input min-h-[120px]"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What happened? What did you expect?"
            />
          </div>

          <div className="space-y-2">
            <label className="ui-label" htmlFor="report-steps">
              Steps
            </label>
            <textarea
              id="report-steps"
              className="ui-input min-h-[120px]"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder={"1) ...\n2) ...\n3) ..."}
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-300">
            <div className="font-semibold text-zinc-200">
              Included debug info
            </div>
            <div className="mt-2 grid gap-1">
              <div>Route: {meta.route}</div>
              <div>User: {meta.uid}</div>
              <div>Email: {meta.email}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="ui-button-primary"
              onClick={handleOpenGmail}
            >
              Open Gmail (web)
            </button>

            <button
              type="button"
              className="ui-button-secondary"
              onClick={handleOpenEmailApp}
            >
              Open email app
            </button>

            <button
              type="button"
              className="ui-button-secondary"
              onClick={handleCopy}
            >
              Copy report
            </button>

            <Link to="/" className="ui-button-secondary text-center">
              Back home
            </Link>
          </div>

          <p className="text-xs text-zinc-400">
            If nothing opens, use Copy and paste into an email to:{" "}
            <span className="font-semibold text-zinc-200">{SUPPORT_EMAIL}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportIssue;
