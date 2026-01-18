import "./globals.css";
import { Inter } from "next/font/google";
import ModalProvider from "./ModalProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "BUTTON",
  description: "Curling fantasy app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ModalProvider>
          {children}
        </ModalProvider>
      </body>
    </html>
  );
}
