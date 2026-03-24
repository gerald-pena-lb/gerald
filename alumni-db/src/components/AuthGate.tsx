"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Nav from "./Nav";
import LoginPage from "@/app/login/page";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (pathname === "/login") {
    return (
      <>
        <Nav />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
