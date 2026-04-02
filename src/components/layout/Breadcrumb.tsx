"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChevronRight } from "lucide-react";

// Route name mapping
const routeNames: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/agents": "Agents",
  "/operations": "Operations",
  "/trading": "Trading",
  "/settings": "Settings",
};

export function Breadcrumb() {
  const pathname = usePathname();
  
  // Get current page name from pathname
  const currentPageName = routeNames[pathname] || "Unknown";
  
  // Check if we're on the home page
  const isHome = pathname === "/";

  return (
    <nav aria-label="Breadcrumb" className="flex items-center">
      <ol className="flex items-center gap-2">
        {/* Home / Root */}
        <li>
          <Link
            href="/"
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 ${
              isHome
                ? "text-slate-100 cursor-default"
                : "text-slate-400 hover:text-slate-100"
            }`}
            aria-current={isHome ? "page" : undefined}
          >
            <Home className="w-4 h-4" />
            {!isHome && <span className="hidden sm:inline">Home</span>}
          </Link>
        </li>

        {/* Separator - only show if not on home */}
        {!isHome && (
          <li>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </li>
        )}

        {/* Current Page - only show if not on home */}
        {!isHome && (
          <li>
            <span
              className="text-sm font-medium text-slate-100"
              aria-current="page"
            >
              {currentPageName}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}
