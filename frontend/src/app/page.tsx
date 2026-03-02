import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

export default function RootPage() {
  // Redirect root to default locale (e.g. /en)
  redirect(`/${routing.defaultLocale}`);
}
