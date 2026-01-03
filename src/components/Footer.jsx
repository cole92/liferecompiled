const Footer = () => {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-2 text-center text-sm text-zinc-400">
          <p>© {new Date().getFullYear()} LifeRecompiled. All rights reserved.</p>

          <p className="text-zinc-500">
            Made with ❤️ by{" "}
            <a
              href="https://github.com/cole92"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-400 hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded"
            >
              cole92
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
