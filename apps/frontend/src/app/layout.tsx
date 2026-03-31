// apps/frontend/src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JournalForge — Hydrogeology Journal Formatter',
  description:
    'Format your manuscript for Springer Hydrogeology Journal submission using AI-powered compliance checking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: '#F5F3EE', color: '#1A1A1A' }}>
        <header
          className="border-b"
          style={{ borderColor: '#1A1A1A', borderBottomWidth: '1px' }}
        >
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
            <div>
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                JournalForge
              </span>
              <span
                className="ml-3 text-sm"
                style={{ color: '#0D6E6E', fontFamily: "'Source Serif 4', serif" }}
              >
                Hydrogeology Journal Formatter
              </span>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
        <footer
          className="border-t mt-20"
          style={{ borderColor: '#1A1A1A', borderTopWidth: '1px' }}
        >
          <div className="max-w-5xl mx-auto px-6 py-6">
            <p className="text-xs" style={{ color: '#6B7280' }}>
              Powered by Claude Sonnet 4.6 via OpenRouter. Not affiliated with Springer Nature.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
