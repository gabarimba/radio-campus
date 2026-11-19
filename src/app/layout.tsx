import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radio Campus | Sistema participativo",
  description: "Radio universitaria con selección musical contextual y votación por QR.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
