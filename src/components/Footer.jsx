const Footer = () => {
  return (
    <footer className="bg-light text-center py-3">
      <p>© {new Date().getFullYear()} Blog App. All rights reserved.</p>
      <p>
        Made with ❤️ by{" "}
        <a
          href="https://github.com/cole92"
          target="_blank"
          rel="noopener noreferrer"
        >
          cole92
        </a>
      </p>
    </footer>
  );
};

export default Footer;
