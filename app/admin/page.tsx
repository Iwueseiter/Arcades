import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { isAdminAuthenticated, isAdminLoginConfigured } from '@/lib/server/admin-auth';

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin configured={isAdminLoginConfigured()} nextPath="/admin" />;
  }
  return (
    <AdminFrame protectedPage>
      <AdminDashboard />
    </AdminFrame>
  );
}
