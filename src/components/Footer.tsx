"use client";

import { usePathname } from "next/navigation";

const getAssetBasePath = () => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_BASE_PATH || "";
  }

  const firstPathSegment = window.location.pathname.split("/").filter(Boolean)[0];
  if (!firstPathSegment || firstPathSegment === "map" || firstPathSegment === "directory") {
    return "";
  }

  return `/${firstPathSegment}`;
};

export default function Footer() {
  const pathname = usePathname();
  const basePath = getAssetBasePath();

  if (pathname === "/map") {
    return null;
  }

  return (
    <footer className="w-full py-6 px-6 mt-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs font-medium text-foreground/40 text-center">
        <span>
          Data by <a href="https://www.reddit.com/r/TrackersInfo/wiki/official_recruitments/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline decoration-dotted underline-offset-4">TrackersInfo</a>
        </span>

        <span className="w-1 h-1 rounded-full bg-foreground/10 shrink-0"></span>

        <a
          href="https://github.com/handokota/trackerpathways"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <img src={`${basePath}/github-light.svg`} alt="GitHub" className="w-3.5 h-3.5 block dark:hidden opacity-80" />
          <img src={`${basePath}/github-dark.svg`} alt="GitHub" className="w-3.5 h-3.5 hidden dark:block opacity-80" />
          <span>GitHub</span>
        </a>
      </div>
    </footer>
  );
}
