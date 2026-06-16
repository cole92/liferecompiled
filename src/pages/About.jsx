import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import aboutMdRaw from "../content/about.md?raw";

/**
 * Extract a simple "hero" title from markdown if the first line is `# ...`.
 * Keeping title outside the markdown body allows a consistent page header layout
 * while still letting the content remain fully markdown-driven.
 *
 * @param {string} md
 * @returns {{ title: string, body: string }}
 */
function getMarkdownTitleAndBody(md) {
  const lines = String(md || "").split("\n");
  const first = (lines[0] || "").trim();

  if (first.startsWith("# ")) {
    const title = first.replace(/^#\s+/, "").trim();

    // Remove the first heading line and trim extra leading empty lines in the body.
    const body = lines
      .slice(1)
      .join("\n")
      .replace(/^\s*\n+/, "");

    return { title, body };
  }

  // If there is no leading H1, keep markdown content as-is.
  return { title: "", body: String(md || "") };
}

/**
 * Markdown renderer overrides used across the About page.
 * Purpose:
 * - Keep typography consistent with the app design system
 * - Apply safe link behavior (internal routes vs hash vs external)
 * - Style code blocks and blockquotes without relying on global markdown CSS
 */
const mdComponents = {
  h1: (props) => (
    <h1 className="mt-10 text-2xl font-semibold text-zinc-100" {...props} />
  ),
  h2: (props) => (
    <h2
      className="mt-10 border-t border-zinc-800 pt-8 text-xl font-semibold tracking-tight text-zinc-100 first:mt-0 first:border-t-0 first:pt-0"
      {...props}
    />
  ),

  h3: (props) => (
    <h3
      className="mt-8 text-base font-semibold tracking-tight text-zinc-100"
      {...props}
    />
  ),
  ol: (props) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-zinc-300" {...props} />
  ),
  p: (props) => <p className="mt-4 leading-7 text-zinc-300" {...props} />,
  ul: (props) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-300" {...props} />
  ),
  li: (props) => <li className="leading-7" {...props} />,
  strong: (props) => (
    <strong className="font-semibold text-zinc-100" {...props} />
  ),
  hr: (props) => <hr className="my-8 border-zinc-800" {...props} />,

  /**
   * Link behavior:
   * - Hash links stay as anchors (same page)
   * - App routes use `<Link>` for SPA navigation
   * - External links open in a new tab with `noopener` for safety
   */
  a: ({ href = "", children, ...props }) => {
    const isHash = href.startsWith("#");
    const isRoute = href.startsWith("/");

    if (isHash) {
      return (
        <a
          href={href}
          className="text-sky-300 hover:text-sky-200 hover:underline underline-offset-4"
          {...props}
        >
          {children}
        </a>
      );
    }

    if (isRoute) {
      return (
        <Link
          to={href}
          className="text-sky-300 hover:text-sky-200 hover:underline underline-offset-4"
        >
          {children}
        </Link>
      );
    }

    return (
      <a
        href={href}
        className="text-sky-300 hover:text-sky-200 hover:underline underline-offset-4"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  },

  blockquote: (props) => (
    <blockquote
      className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-300"
      {...props}
    />
  ),

  /**
   * Code styling:
   * - Inline code uses a compact pill background
   * - Block code is scrollable and framed to avoid layout breaks on long lines
   */
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code
          className="rounded bg-zinc-900/70 px-1.5 py-0.5 text-sm text-zinc-200"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code
        className={`mt-4 block overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-200 ${
          className || ""
        }`}
        {...props}
      >
        {children}
      </code>
    );
  },
};

const proofPoints = [
  "React/Vite app with Firebase Auth, Firestore, and Cloud Functions",
  "Backend-owned counters, badge rules, and maintenance-oriented flows",
  "Dashboard workflows for posts, saved items, stats, trash, and moderation",
];

/**
 * @component About
 *
 * Markdown-driven About page.
 * - Title is extracted from the first `# ...` heading to render a consistent hero.
 * - Body is rendered with `react-markdown` + `remark-gfm` for tables/lists/code.
 * - Links are routed safely (hash vs internal routes vs external new-tab).
 *
 * @returns {JSX.Element}
 */
const About = () => {
  const { title, body } = getMarkdownTitleAndBody(aboutMdRaw);

  return (
    <div className="w-full px-2 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-7xl">
        {/* Hero */}
        <header className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:mb-6 sm:p-7 lg:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
              Product case study
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-4xl lg:text-5xl">
              {title || "About"}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
              A serious full-stack portfolio project focused on product
              behavior, data integrity, permissions, and deploy-ready
              engineering decisions.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link to="/" className="ui-button-secondary text-center">
                Explore app
              </Link>

              <Link to="/report" className="ui-button-primary text-center">
                Support & feedback
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-4 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Proof points
              </p>

              <ul className="mt-3 space-y-3 text-sm leading-6 text-zinc-300">
                {proofPoints.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Project framing
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Built as a small practical product, not a startup pitch. The
                emphasis is on traceable engineering decisions and demo-ready
                behavior.
              </p>
            </section>
          </aside>

          <main className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-7 lg:p-8">
            <div className="mb-6 border-b border-zinc-800 pb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Implementation notes
              </p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-100">
                What the app implements
              </h2>
            </div>

            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {body}
            </ReactMarkdown>

            <div className="mt-10 border-t border-zinc-800 pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-zinc-400">
                  Have feedback or found a bug? The support flow includes useful
                  context automatically.
                </p>

                <Link to="/report" className="ui-button-secondary text-center">
                  Open support
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default About;
