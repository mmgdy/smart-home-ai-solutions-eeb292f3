import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { WhatsAppButton } from './WhatsAppButton';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col scroll-smooth">
      <Header />
      <main className="flex-1 scroll-margin-top-16 md:scroll-margin-top-20">{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
