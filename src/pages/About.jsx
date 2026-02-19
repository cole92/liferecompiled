// src/pages/About.jsx
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import aboutMdRaw from "../content/about.md?raw";

function extractMarkdownTitle(md) {
  const lines = String(md || "").split("\n");
  const first = (lines[0] || "").trim();

  if (first.startsWith("# ")) {
    const title = first.replace(/^#\s+/, "").trim();
    const rest = lines.slice(1).join("\n").replace(/^\s*\n+/, "");
    return { title: title || "About", body: rest };
  }

  return { title: "About", body: String(md || "") };
}

const mdComponents = {
  h1: ({ ...props }) => (
    <h1 className="mt-10 text-2xl font-semibold text-zinc-100" {...props} />
  ),
  h2: ({ ...props }) => (
    <h2 className="mt-10 text-xl font-semibold tracking-tight text-zinc-100" {...props} />
  ),
  p: ({ ...props }) => (
    <p className="mt-4 leading-7 text-zinc-300" {...props} />
  ),
  ul: ({ ...props }) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-300" {...props} />
  ),
  li: ({ ...props }) => <li className="leading-7" {...props} />,
  strong: ({ ...props }) => <strong className="font-semibold text-zinc-100" {...props} />,
  hr: ({ ...props }) => <hr className="my-8 border-zinc-800" {...props} />,
  a: ({ href = "", children, ...props }) => {
    const isInternal = href.startsWith("/") || href.startsWith("#");

    if (isInternal) {
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
  blockquote: ({ ...props }) => (
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
        className={`mt-4 block overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-200 ${className || ""}`}
        {...props}
      >
        {children}
      </code>
    );
  },
};

const About = () => {
  const { title, body } = extractMarkdownTitle(aboutMdRaw);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="ui-card p-6 sm:p-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-1 text-xs font-medium text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
            About
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
            {title}
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-300 leading-7">
            A living portfolio and an evolving community built around real problems, real progress,
            and the journey behind building.
          </p>
        </div>

        <div className="border-t border-zinc-800 pt-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {body}
          </ReactMarkdown>
        </div>

        {/* CTA */}
        <div className="mt-10 border-t border-zinc-800 pt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-400">
              Have feedback or found a bug? Use the in-app report flow so it includes helpful context.
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
