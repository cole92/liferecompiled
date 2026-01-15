const Footer = () => {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-zinc-500">
          © {new Date().getFullYear()} LifeRecompiled · Created by{" "}
          <a
            href="https://github.com/cole92"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-400 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded"
          >
            Aleksandar Todorovic
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
