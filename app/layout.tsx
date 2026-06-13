import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Career Sprint OS',
  description: '30-day AI engineer job sprint — track, build, and land the role',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
