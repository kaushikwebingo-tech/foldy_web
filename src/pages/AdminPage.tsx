import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { adminApi } from '@/api/adminApi';
import { setAdminToken } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

export default function AdminPage() {
  const [email, setEmail]       = useState('');
  const [password, setPass]     = useState('');
  const [fullName, setName]     = useState('');
  const [userId, setUserId]     = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState('1');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Admin Panel"
        subtitle="Admin authentication and user management. Admin token is auto-saved separately from the app user token."
        icon={<ShieldCheck size={18} />}
        badge="Admin Only"
        postmanSection="admin"
      />

      <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
        <strong>Admin routes:</strong> These call <code className="bg-red-100 px-1 rounded">/api/admin/v1/</code> and use a separate admin JWT stored under <code className="bg-red-100 px-1 rounded">foldy_admin_token</code>.
      </div>

      <div className="space-y-4">
        {/* Admin Login */}
        <ApiCard
          title="Admin Login"
          method="POST"
          endpoint="/api/admin/v1/auth/login"
          description="Authenticates as an admin. Token is auto-saved to localStorage as foldy_admin_token."
          onSubmit={async () => {
            const res = await adminApi.login(email, password);
            if (res.data?.data?.token) setAdminToken(res.data.data.token);
            return res;
          }}
        >
          <Field label="Admin Email" value={email} onChange={setEmail} placeholder="admin@foldy.in" type="email" />
          <Field label="Password" value={password} onChange={setPass} placeholder="••••••••" type="password" />
        </ApiCard>

        {/* Admin Register */}
        <ApiCard
          title="Register Admin"
          method="POST"
          endpoint="/api/admin/v1/auth/register"
          description="Creates a new admin account."
          onSubmit={() => adminApi.register(email, password, fullName)}
        >
          <Field label="Full Name" value={fullName} onChange={setName} placeholder="Admin Name" />
          <Field label="Admin Email" value={email} onChange={setEmail} placeholder="admin@foldy.in" type="email" />
          <Field label="Password" value={password} onChange={setPass} placeholder="••••••••" type="password" />
        </ApiCard>

        {/* Pending requests */}
        <ApiCard
          title="List Pending App Requests"
          method="GET"
          endpoint="/api/admin/v1/approve-reject/pending"
          description="Returns all pending user application requests awaiting admin approval."
          onSubmit={() => adminApi.getPending(Number(page))}
        >
          <Field label="Page" value={page} onChange={setPage} placeholder="1" type="number" />
        </ApiCard>

        {/* Approve */}
        <ApiCard
          title="Approve User Request"
          method="POST"
          endpoint="/api/admin/v1/approve-reject/approve"
          description="Approves a user's application request and sends approval notification."
          onSubmit={() => adminApi.approveUser(userId)}
          buttonLabel="Approve"
        >
          <Field label="User ID" value={userId} onChange={setUserId} placeholder="MongoDB ObjectId of user" fullWidth />
        </ApiCard>

        {/* Reject */}
        <ApiCard
          title="Reject User Request"
          method="POST"
          endpoint="/api/admin/v1/approve-reject/reject"
          description="Rejects a user's application request and sends rejection notification."
          onSubmit={() => adminApi.rejectUser(userId)}
          buttonLabel="Reject"
        >
          <Field label="User ID" value={userId} onChange={setUserId} placeholder="MongoDB ObjectId of user" fullWidth />
        </ApiCard>

        {/* List admins */}
        <ApiCard
          title="List Admin Users"
          method="GET"
          endpoint="/api/admin/v1/admin-users"
          description="Returns paginated list of admin accounts with optional search."
          onSubmit={() => adminApi.listAdmins(Number(page), 10, search || undefined)}
        >
          <Field label="Search (optional)" value={search} onChange={setSearch} placeholder="Name or email" />
          <Field label="Page" value={page} onChange={setPage} placeholder="1" type="number" />
        </ApiCard>
      </div>
    </div>
  );
}
