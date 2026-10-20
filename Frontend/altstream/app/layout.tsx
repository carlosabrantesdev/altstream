import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AIPopUp from "./components/AIPopUp";
import AuthProvider from "./components/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AltStream",
  description: "Seu site de streaming",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable}`}>
      <head>
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" 
        />
      </head>
      <body className={`antialiased ${inter.className}`}>
        <AuthProvider>
          {children}
          <AIPopUp />
        </AuthProvider>
      </body>
    </html>
  );
}
