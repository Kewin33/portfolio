import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (typeof locale !== 'string' || !routing.locales.includes(locale as any)) {
    notFound();
  }
 
  const messages = await getMessages({locale: locale as any});
  const siteTitle = 'Alexander Chen — Portfolio';
  const siteDescription = 'Portfolio of Alexander Chen';
 
  return (
    <html lang={locale}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        <link rel="icon" href="/favicon.png" />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex min-h-screen">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Sidebar />
          <main className="flex-1 w-full relative min-h-screen flex flex-col overflow-y-auto">
            <div className="flex-1">{children}</div>
            <Footer />
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
