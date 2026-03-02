import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (typeof locale !== 'string' || !routing.locales.includes(locale)) {
    notFound();
  }
 
  const messages = await getMessages({locale});
 
  return (
    <html lang={locale}>
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex min-h-screen">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Sidebar />
          <main className="flex-1 w-full relative h-screen overflow-y-auto">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
