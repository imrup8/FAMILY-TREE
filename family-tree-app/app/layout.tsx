import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "পারিবারিক বংশতালিকা | Family Genealogy System",
  description: "AI-চালিত পারিবারিক বংশতালিকা ও পূর্বপুরুষ ব্যবস্থাপনা সিস্টেম",
  keywords: ["genealogy", "family tree", "বংশতালিকা", "পারিবারিক ইতিহাস", "Bengali"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
