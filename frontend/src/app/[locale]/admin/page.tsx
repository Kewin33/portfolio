import AdminShell from '@/components/admin/AdminShell';

export const metadata = { title: 'Admin' };

export default function Page() {
  return (
    <div className="min-h-screen py-12 bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl">
        <AdminShell />
      </div>
    </div>
  );
}
