import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import AuthGate from "@/components/AuthGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "UP Alpha Sigma Fraternity - Alumni Database",
  description: "Alumni Database & CRM for the University of the Philippines Alpha Sigma Fraternity",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
