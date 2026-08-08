import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "방명록",
  description: "누구나 이름과 함께 글을 남길 수 있는 방명록입니다.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
