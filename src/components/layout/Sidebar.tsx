"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Bot,
  Activity,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// Types
interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Section {
  id: string;
  title: string;
  items: NavItem[];
}

// Navigation sections configuration
const sections: Section[] = [
  {
    id: "main",
    title: "Main",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    id: "trading",
    title: "Trading",
    items: [{ label: "Trading", href: "/trading", icon: Bot }],
  },
  {
    id: "system",
    title: "System",
    items: [
      { label: "Operations", href: "/operations", icon: Activity },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

// Collapsible Section Component
interface CollapsibleSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onToggle?: (id: string, expanded: boolean) => void;
}

function CollapsibleSection({
  id,
  title,
  children,
  defaultExpanded = true,
  onToggle,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isAnimating, setIsAnimating] = useState(false);

  // Notify parent of initial state
  useEffect(() => {
    onToggle?.(id, isExpanded);
  }, []);

  const handleToggle = () => {
    setIsAnimating(true);
    const newState = !isExpanded;
    setIsExpanded(newState);
    onToggle?.(id, newState);

    // Reset animation flag after transition completes
    setTimeout(() => setIsAnimating(false), 200);
  };

  return (
    <div className="border-b border-slate-800/50 last:border-b-0">
      {/* Section Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 hover:bg-slate-800/50 transition-all duration-200 group"
        aria-expanded={isExpanded}
        aria-controls={`section-${id}`}
      >
        <span>{title}</span>
        <span
          className={`transform transition-transform duration-200 ease-out ${
            isExpanded ? "rotate-0" : "-rotate-90"
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
      </button>

      {/* Collapsible Content */}
      <div
        id={`section-${id}`}
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-2 space-y-1">{children}</div>
      </div>
    </div>
  );
}

// Nav Item Component
function NavItemLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
        isActive
          ? "bg-slate-800 text-white shadow-sm"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
      }`}
    >
      <item.icon
        className={`w-5 h-5 transition-colors duration-200 ${
          isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
        }`}
      />
      <span>{item.label}</span>
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
      )}
    </Link>
  );
}

// Main Sidebar Component
interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed-sections");
      if (saved) {
        setCollapsedSections(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load sidebar state:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save collapsed state to localStorage
  const handleSectionToggle = (id: string, expanded: boolean) => {
    setCollapsedSections((prev) => {
      const updated = { ...prev, [id]: !expanded };
      try {
        localStorage.setItem("sidebar-collapsed-sections", JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save sidebar state:", error);
      }
      return updated;
    });
  };

  // Prevent hydration mismatch
  if (!isLoaded) {
    return (
      <aside className="w-64 h-screen bg-slate-950 border-r border-slate-800 flex flex-col fixed left-0 top-0">
        <div className="p-6 border-b border-slate-800">
          <div className="animate-pulse">
            <div className="h-6 bg-slate-800 rounded w-32" />
            <div className="h-3 bg-slate-800 rounded w-24 mt-2" />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 h-screen bg-slate-950 border-r border-slate-800 flex flex-col fixed left-0 top-0">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold flex items-center gap-2 text-slate-100">
          <span className="text-emerald-400">●</span>
          Mission Control
        </h1>
        <p className="text-xs text-slate-400 mt-1">Autonomous AI Operations</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <CollapsibleSection
            key={section.id}
            id={section.id}
            title={section.title}
            defaultExpanded={!collapsedSections[section.id]}
            onToggle={handleSectionToggle}
          >
            {section.items.map((item) => (
              <NavItemLink key={item.href} item={item} onClick={onNavigate} />
            ))}
          </CollapsibleSection>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-400 text-xs font-bold">MC</span>
          </div>
          <div className="text-sm">
            <p className="font-medium text-slate-100">Admin</p>
            <p className="text-xs text-slate-500">Online</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
