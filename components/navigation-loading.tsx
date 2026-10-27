"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Loading from "@/app/loading";
import { NAVIGATION_LOADING_EVENT } from "@/lib/navigation-loading";

export function NavigationLoading() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;

    const showLoading = () => {
      setIsLoading(true);
      if (safetyTimer) clearTimeout(safetyTimer);
      safetyTimer = setTimeout(() => setIsLoading(false), 15_000);
    };

    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest("a[href]");
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target ||
        link.hasAttribute("download")
      ) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        destination.pathname !== window.location.pathname
      ) {
        showLoading();
      }
    };

    const handlePopState = () => showLoading();

    document.addEventListener("click", handleClick, true);
    window.addEventListener(NAVIGATION_LOADING_EVENT, showLoading);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener(NAVIGATION_LOADING_EVENT, showLoading);
      window.removeEventListener("popstate", handlePopState);
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

  useEffect(() => {
    const completionTimer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(completionTimer);
  }, [pathname]);

  return isLoading ? <Loading /> : null;
}
