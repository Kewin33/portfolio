"use client";

import { Mail, Github } from 'lucide-react';
import { usePathname } from '@/i18n/routing';
import AccountControls from '@/components/core/auth/AccountControls';

export default function Footer() {
  const year = new Date().getFullYear();
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <footer className="w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-4">
        {isHome && (
          <div className="w-full flex justify-center md:justify-end">
            <AccountControls variant="footer" />
          </div>
        )}

        <div className="w-full text-sm text-gray-700 dark:text-gray-300 text-left">
          © {year} Alexander Chen — All rights reserved.
        </div>

        <nav className="w-full flex items-center justify-end gap-4 text-sm">
          <a
            href="mailto:qingzhi1002@gmail.com"
            className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:underline"
          >
            <Mail size={14} />
            Contact
          </a>
          <a
            href="https://github.com/kewin33"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:underline"
          >
            <Github size={14} />
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
