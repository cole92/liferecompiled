// src/pages/ReportIssue.jsx
import { useContext, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";

const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL || "liferecompiled.contact@gmail.com";

/**
 * Build a mailto: link (works with the user's default mail client).
 *
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.body
 * @returns {string}
 */
function buildMailto({ to, subject, body }) {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return `mailto:${to}?subject=${s}&body=${b}`;
}

/**
 * Build a Gmail web compose link (opens Gmail in the browser).
 *
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.body
 * @returns {string}
 */
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

/**
 * @component ReportIssue
 *
 * Support & feedback page.
 *
 * What it does:
 * - Collects a category, title, message, and optional steps to reproduce.
 * - Auto-includes basic debug metadata (route, url, uid/email, user agent, timestamp).
 * - Helps the user send the report via:
 *   - Gmail (web)
 *   - Default email app (mailto)
 *   - Copy-to-clipboard fallback
 *
 * Notes:
 * - We require Title + Message before opening links/copying.
 * - We avoid storing anything; this is a "compose and handoff" page.
 */
const ReportIssue = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const [type, setType] = useState("Support");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [steps, setSteps] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  /**
   * Debug metadata to include in the email body.
   * Memoized to avoid recomputing unless route/user changes.
   */
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

  /**
   * Email subject line.
   */
  const subject = useMemo(() => {
    const t = title.trim() || "No title";
    return `[${type}] ${t} (route: ${meta.route})`;
  }, [type, title, meta.route]);

  /**
   * Full email body (user input + debug info).
   */
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

  /**
   * mailto: link (default email app).
   */
  const mailtoHref = useMemo(() => {
    return buildMailto({ to: SUPPORT_EMAIL, subject, body: composedBody });
  }, [subject, composedBody]);

  /**
   * Gmail web compose link.
   */
  const gmailHref = useMemo(() => {
    return buildGmailComposeUrl({
      to: SUPPORT_EMAIL,
      subject,
      body: composedBody,
    });
  }, [subject, composedBody]);

  /**
   * Validate required fields (title + message).
   *
   * @returns {boolean}
   */
  const validateRequired = () => {
    setAttemptedSubmit(true);

    if (!title.trim() || !details.trim()) {
      showErrorToast("Please enter a title and a message.", {
        toastId: "report-required",
      });
      return false;
    }
    return true;
  };

  /**
   * Copy the full report payload to clipboard.
   */
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

  const titleHasError = attemptedSubmit && !title.trim();
  const detailsHasError = attemptedSubmit && !details.trim();
  const titleDescriptionIds = titleHasError
    ? "report-title-help report-title-error"
    : "report-title-help";
  const detailsDescriptionIds = detailsHasError
    ? "report-details-help report-details-error"
    : "report-details-help";

  return (
    <div className="w-full px-2 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
            Support
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            Support & feedback
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
            Send a bug report, feedback, or a feature request. Your message is
            handed off to email with useful app context included automatically.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]">
          <main className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-zinc-100">
                Write your message
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                A title and message are required before opening an email draft.
              </p>
            </div>

            <div className="space-y-5">
              {/* Category */}
              <div>
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
              <div>
                <label className="ui-label" htmlFor="report-title">
                  Title <span className="text-zinc-400">(required)</span>
                </label>
                <input
                  id="report-title"
                  className="ui-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short summary, e.g. Search freezes"
                  autoComplete="off"
                  maxLength={120}
                  aria-invalid={titleHasError ? "true" : "false"}
                  aria-describedby={titleDescriptionIds}
                />
                <p id="report-title-help" className="ui-help text-xs">
                  Keep it short. You can explain below.
                </p>
                {titleHasError && (
                  <p id="report-title-error" className="ui-error" role="alert">
                    Add a short title before sending.
                  </p>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="ui-label" htmlFor="report-details">
                  Message <span className="text-zinc-400">(required)</span>
                </label>
                <textarea
                  id="report-details"
                  className="ui-input min-h-[150px]"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="What happened, what did you expect, or what should be improved?"
                  aria-invalid={detailsHasError ? "true" : "false"}
                  aria-describedby={detailsDescriptionIds}
                />
                <p id="report-details-help" className="ui-help text-xs">
                  Include what happened and what would have helped.
                </p>
                {detailsHasError && (
                  <p
                    id="report-details-error"
                    className="ui-error"
                    role="alert"
                  >
                    Add a message before sending.
                  </p>
                )}
              </div>

              {/* Steps toggle + textarea */}
              <div className="rounded-xl bg-zinc-900 p-3 sm:rounded-2xl sm:border sm:border-zinc-800 sm:bg-zinc-950 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="ui-label" htmlFor="report-steps">
                      Steps to reproduce
                    </label>
                    <p className="mt-1 text-xs text-zinc-500">
                      Optional, useful for bugs or UI issues.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="ui-button-secondary px-3 py-1.5 text-xs"
                    onClick={() => setShowSteps((v) => !v)}
                  >
                    {showSteps ? "Hide" : "Add steps"}
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
            </div>
          </main>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-semibold text-zinc-100">
                Send report
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Choose the email handoff that works best on this device.
              </p>

              <div className="mt-4 grid gap-2">
                <a
                  href={gmailHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-button-primary text-center"
                  onClick={(e) => {
                    if (!validateRequired()) e.preventDefault();
                  }}
                >
                  Open Gmail
                </a>

                <a
                  href={mailtoHref}
                  className="ui-button-secondary text-center"
                  onClick={(e) => {
                    if (!validateRequired()) e.preventDefault();
                  }}
                >
                  Open email app
                </a>

                <button
                  type="button"
                  className="ui-button-secondary"
                  onClick={handleCopy}
                >
                  Copy report
                </button>
              </div>

              <p className="mt-4 text-xs leading-5 text-zinc-500">
                If nothing opens, copy the report and paste it into an email to{" "}
                <span className="font-semibold text-zinc-300">
                  {SUPPORT_EMAIL}
                </span>
                .
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-semibold text-zinc-100">
                Included context
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                These details are added to the email so the report is easier to
                understand.
              </p>

              <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">
                <summary className="cursor-pointer font-semibold text-zinc-200">
                  View included details
                </summary>
                <div className="mt-3 grid gap-1">
                  <div>Route: {meta.route}</div>
                  <div>User: {meta.uid}</div>
                  <div>Email: {meta.email}</div>
                </div>
              </details>
            </section>

            <Link
              to="/"
              className="inline-flex text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:underline underline-offset-4"
            >
              Back home
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ReportIssue;
