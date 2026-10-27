import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { StoreHydrator } from "@/components/store-hydrator";
import { Providers } from "@/components/providers/SessionProvider";
import { NavigationLoading } from "@/components/navigation-loading";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_APP_URL;

export const metadata: Metadata = {
  title: {
    default: "TaskFlow — Project Management for Teams",
    template: "%s | TaskFlow",
  },
  description:
    "Organize workspaces, projects, and tasks with your team. TaskFlow makes it easy to assign work, track status, and invite collaborators.",
  ...(appUrl ? { metadataBase: new URL(appUrl) } : {}),
  openGraph: {
    title: "TaskFlow — Project Management for Teams",
    description: "Organize workspaces, projects, and tasks with your team.",
    ...(appUrl ? { url: appUrl } : {}),
    siteName: "TaskFlow",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <NavigationLoading />
          <StoreHydrator /> 
          {children}
        </Providers>
      </body>
    </html>
  );
}
