"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

export default function Nav() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/brods", label: "Brods" },
    { href: "/projects", label: "Projects" },
    { href: "/events", label: "Events" },
    { href: "/finances", label: "Finances" },
    { href: "/reports", label: "Reports" },
    ...(isAdmin ? [{ href: "/users", label: "Users" }] : []),
  ];

  return (
    <nav className="bg-[#1e3a5f] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-bold tracking-tight leading-tight flex-shrink-0">
            <span className="block text-xl">UP Alpha Sigma Fraternity</span>
            <span className="block text-sm font-medium text-white/80 hidden sm:block">Alumni Association</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <div className="flex items-center ml-4 pl-4 border-l border-white/20">
                <span className="text-sm text-white/70 mr-3">
                  {user.display_name}
                  {isAdmin && <span className="ml-1 text-[#c9a227] text-xs">(Admin)</span>}
                </span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-md text-sm text-white/80 hover:bg-white/10 hover:text-white"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-md text-sm font-medium ${
                pathname.startsWith(link.href)
                  ? "bg-white/20 text-white"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-sm text-white/70">
                {user.display_name}
                {isAdmin && <span className="ml-1 text-[#c9a227] text-xs">(Admin)</span>}
              </span>
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="px-3 py-1.5 rounded-md text-sm text-white/80 hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
