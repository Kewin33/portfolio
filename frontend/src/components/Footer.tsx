import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-1/2 text-sm text-gray-700 dark:text-gray-300 text-left">
          © {year} Alexander Chen — All rights reserved.
        </div>

        <nav className="w-full md:w-1/2 flex items-center justify-end gap-4 text-sm">
          <Link href="/en" className="text-gray-600 dark:text-gray-300 hover:underline">
            English
          </Link>
          <Link href="/de" className="text-gray-600 dark:text-gray-300 hover:underline">
            Deutsch
          </Link>
          <a
            href="mailto:qingzhi1002@gmail.com"
            className="text-gray-600 dark:text-gray-300 hover:underline"
          >
            Contact
          </a>
          <a
            href="https://github.com/kewin33"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-300 hover:underline"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
