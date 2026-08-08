import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "German Learning OS",
  description:
    "Lessons 1–2 Alpha web shell with validated publication routes and learner-safe content projection.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
