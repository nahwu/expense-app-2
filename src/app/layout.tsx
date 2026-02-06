import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expense App 2",
  description: "Self-hosted expense, income, and net worth tracker",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

