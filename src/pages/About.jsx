import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import aboutMdRaw from "../content/about.md?raw";

function stripMarkdownTitle(md) {
  const lines = String(md || "").split("\n");
  const first = (lines[0] || "").trim();

  if (first.startsWith("# ")) {
    const rest = lines
      .slice(1)
      .join("\n")
      .replace(/^\s*\n+/, "");
    return rest;
  }

  return String(md || "");
}

const mdComponents = {
  h1: (props) => (
    <h1 className="mt-10 text-2xl font-semibold text-zinc-100" {...props} />
  ),
  h2: (props) => (
    <h2
      className="mt-10 text-xl font-semibold tracking-tight text-zinc-100"
      {...props}
    />
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
      className="mt-6 border-l-2 border-zinc-800 pl-4 text-zinc-300/95 italic"
      {...props}
    />
  ),
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

const About = () => {
  const body = stripMarkdownTitle(aboutMdRaw);

  return (
    <div className="mx-auto w-full max-w-3xl px-1.5 py-10 sm:px-4">
      <div className="ui-card p-6 sm:p-8">
        {/* Hero (no title, only eyebrow) */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-1 text-xs font-medium text-zinc-300">
            <span className="h-3.5 w-3.5 rounded-full bg-sky-300" />
            LifeRecompiled / About
          </div>
        </div>

        {/* Content with subtle premium line */}
        <div className="relative border-t border-zinc-800 pt-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-sky-400/20 via-transparent to-fuchsia-400/20"
          />

          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {body}
          </ReactMarkdown>
        </div>

        {/* CTA */}
        <div className="mt-10 border-t border-zinc-800 pt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-400">
              Have feedback or found a bug? Use the in-app report flow so it
              includes helpful context.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link to="/" className="ui-button-secondary text-center">
                Back home
              </Link>

              <Link to="/report" className="ui-button-primary text-center">
                Support & feedback
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
