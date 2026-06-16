import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Central route scroll manager.
 *
 * - New route pushes/replaces jump to the top immediately.
 * - Hash links keep native anchor behavior.
 * - Browser Back/Forward preserves the browser's previous scroll position.
 */
const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (hash || navigationType === "POP") return;

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search, hash, navigationType]);

  return null;
};

export default ScrollToTop;
