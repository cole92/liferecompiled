// src/pages/ReportIssue.jsx
import { useContext, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";

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

const TYPE_OPTIONS = [
  "Support",
  "Bug",
  "Feedback",
  "Feature request",
  "UI issue",
  "Performance",
  "Other",
];

const ReportIssue = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const [type, setType] = useState("Support");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [steps, setSteps] = useState("");
  const [showSteps, setShowSteps] = useState(false);

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
      "Message:",
      details.trim() || "-",
      "",
      "Steps (optional):",
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
      showErrorToast("Please enter a title and a message.", {
        toastId: "report-required",
      });
      return false;
    }
    return true;
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
      showSuccessToast("Copied. Paste it into any email client.", {
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
          Support & feedback
        </h2>
        <p className="mt-1 text-sm text-zinc-300">
          Send a bug report, feedback, or a feature request. Basic debug info is
          included automatically.
        </p>

        <div className="mt-6 space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <label className="ui-label" htmlFor="report-type">
              Category
            </label>
            <select
              id="report-type"
              className="ui-input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="ui-label" htmlFor="report-title">
              Title <span className="text-zinc-400">(required)</span>
            </label>
            <input
              id="report-title"
              className="ui-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary (e.g. 'Search freezes')"
              autoComplete="off"
              maxLength={120}
            />
            <p className="text-xs text-zinc-400">
              Keep it short — you can explain below.
            </p>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <label className="ui-label" htmlFor="report-details">
              Message <span className="text-zinc-400">(required)</span>
            </label>
            <textarea
              id="report-details"
              className="ui-input min-h-[140px]"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What happened, what did you expect, or what should be improved?"
            />
          </div>

          {/* Steps toggle + field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="ui-label" htmlFor="report-steps">
                Steps <span className="text-zinc-400">(optional)</span>
              </label>

              <button
                type="button"
                className="text-xs text-zinc-300 hover:text-zinc-100 hover:underline underline-offset-4"
                onClick={() => setShowSteps((v) => !v)}
              >
                {showSteps ? "Hide steps" : "Add steps"}
              </button>
            </div>

            {showSteps && (
              <textarea
                id="report-steps"
                className="ui-input min-h-[120px]"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder={"1) ...\n2) ...\n3) ..."}
              />
            )}
          </div>

          {/* Debug info */}
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

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={gmailHref}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-button-primary text-center"
              onClick={(e) => {
                if (!validateRequired()) e.preventDefault();
              }}
            >
              Open Gmail (web)
            </a>

            <a
              href={mailtoHref}
              className="ui-button-secondary text-center"
              onClick={(e) => {
                if (!validateRequired()) e.preventDefault();
              }}
            >
              Open email app (device)
            </a>

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
