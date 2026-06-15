import { useState, useRef } from "react";
import ApiCard from "@/components/ApiCard";
import { adminApi } from "@/api/adminApi";
import { setAdminToken } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import { Field, SelectField } from "@/components/Field";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [fullName, setName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState("1");

  // Subscription plan catalog (Super Admin)
  const [planType, setPlanType] = useState("individual");
  const [planName, setPlanName] = useState("Individual");
  const [planPrice, setPlanPrice] = useState("1");
  const [planInterval, setPlanInterval] = useState("monthly");
  const [planStorageGb, setPlanStorageGb] = useState("10");
  const [planMaxFolders, setPlanMaxFolders] = useState("10");
  const [planMaxFiles, setPlanMaxFiles] = useState("20");
  const [planDesc, setPlanDesc] = useState("");
  const [planId, setPlanId] = useState("");
  const [planActive, setPlanActive] = useState("true");

  // Statistics (Super Admin)
  const [statsActiveDays, setStatsActiveDays] = useState("30");
  const [statsTrendMonths, setStatsTrendMonths] = useState("6");

  // Management actions (Super Admin)
  const [mgUserId, setMgUserId] = useState("");
  const [mgPaymentId, setMgPaymentId] = useState("");
  const [mgRefundAmount, setMgRefundAmount] = useState("");
  const [mgSearch, setMgSearch] = useState("");
  const [mgAuditAction, setMgAuditAction] = useState("");

  // Confirmation + reason modal for destructive actions.
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    requireReason: boolean;
    reason: string;
  }>({ open: false, title: "", message: "", requireReason: false, reason: "" });
  const confirmResolver = useRef<
    ((v: { confirmed: boolean; reason: string }) => void) | null
  >(null);

  // Opens the modal and resolves once the admin confirms or cancels.
  const confirmAction = (opts: {
    title: string;
    message: string;
    requireReason?: boolean;
  }) =>
    new Promise<{ confirmed: boolean; reason: string }>((resolve) => {
      confirmResolver.current = resolve;
      setConfirm({
        open: true,
        title: opts.title,
        message: opts.message,
        requireReason: !!opts.requireReason,
        reason: "",
      });
    });

  const submitConfirm = () => {
    if (confirm.requireReason && !confirm.reason.trim()) return; // reason is mandatory
    confirmResolver.current?.({
      confirmed: true,
      reason: confirm.reason.trim(),
    });
    confirmResolver.current = null;
    setConfirm((s) => ({ ...s, open: false }));
  };

  const dismissConfirm = () => {
    confirmResolver.current?.({ confirmed: false, reason: "" });
    confirmResolver.current = null;
    setConfirm((s) => ({ ...s, open: false }));
  };

  const GB = 1024 * 1024 * 1024;

  // Build a partial update payload — only fields the admin actually filled in are sent.
  const buildPlanUpdate = () => {
    const p: Record<string, unknown> = {};
    if (planName) p.name = planName.trim();
    if (planPrice) p.price = Number(planPrice);
    if (planInterval) p.interval = planInterval;
    if (planStorageGb) p.storageLimit = Number(planStorageGb) * GB;
    if (planMaxFolders) p.maxFolders = Number(planMaxFolders);
    if (planMaxFiles) p.maxFilesPerFolder = Number(planMaxFiles);
    if (planDesc) p.description = planDesc;
    return p;
  };

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
        <strong>Admin routes:</strong> These call{" "}
        <code className="bg-red-100 px-1 rounded">/api/admin/v1/</code> and use
        a separate admin JWT stored under{" "}
        <code className="bg-red-100 px-1 rounded">foldy_admin_token</code>.
      </div>

      <div className="space-y-4">
        {/* Admin Register */}
        <ApiCard
          title="Register Admin"
          method="POST"
          endpoint="/api/admin/v1/auth/register"
          description="Creates a new admin account."
          onSubmit={() => adminApi.register(email, password, fullName)}
        >
          <Field
            label="Full Name"
            value={fullName}
            onChange={setName}
            placeholder="Admin Name"
          />
          <Field
            label="Admin Email"
            value={email}
            onChange={setEmail}
            placeholder="admin@foldy.in"
            type="email"
          />
          <Field
            label="Password"
            value={password}
            onChange={setPass}
            placeholder="••••••••"
            type="password"
          />
        </ApiCard>

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
          <Field
            label="Admin Email"
            value={email}
            onChange={setEmail}
            placeholder="admin@foldy.in"
            type="email"
          />
          <Field
            label="Password"
            value={password}
            onChange={setPass}
            placeholder="••••••••"
            type="password"
          />
        </ApiCard>

        {/* List admins */}
        <ApiCard
          title="List Admin Users"
          method="GET"
          endpoint="/api/admin/v1/admin-users"
          description="Returns paginated list of admin accounts with optional search."
          onSubmit={() =>
            adminApi.listAdmins(Number(page), 10, search || undefined)
          }
        >
          <Field
            label="Search (optional)"
            value={search}
            onChange={setSearch}
            placeholder="Name or email"
          />
          <Field
            label="Page"
            value={page}
            onChange={setPage}
            placeholder="1"
            type="number"
          />
        </ApiCard>

        {/* --- Subscription plan catalog (Super Admin) --- */}
        <div className="pt-3 pb-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Subscription Plans · Super Admin
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage tiers &amp; pricing. Editing a plan only affects new
            subscribes/renewals — active subscribers keep their original price
            (grandfathered).
          </p>
        </div>

        {/* List plans */}
        <ApiCard
          title="List Plans"
          method="GET"
          endpoint="/api/admin/v1/plans"
          description="Returns the full plan catalog (active + inactive) with price, interval and quotas."
          onSubmit={() => adminApi.listPlans()}
        />

        Create plan
        <ApiCard
          title="Create Plan"
          method="POST"
          endpoint="/api/admin/v1/plans"
          description="Creates a plan for a tier (one per tier). Price is in ₹; storage is entered in GB and stored as bytes."
          buttonLabel="Create"
          onSubmit={() =>
            adminApi.createPlan({
              planType,
              name: planName.trim(),
              description: planDesc,
              price: Number(planPrice),
              currency: "INR",
              interval: planInterval,
              storageLimit: Number(planStorageGb) * GB,
              maxFolders: Number(planMaxFolders),
              maxFilesPerFolder: Number(planMaxFiles),
              isActive: true,
            })
          }
        >
          <SelectField
            label="Plan Type"
            value={planType}
            onChange={setPlanType}
            options={[
              { label: "Trial", value: "trial" },
              { label: "Individual", value: "individual" },
              { label: "Business", value: "business" },
              { label: "Enterprise", value: "enterprise" },
            ]}
          />
          <Field
            label="Name"
            value={planName}
            onChange={setPlanName}
            placeholder="Individual"
          />
          <Field
            label="Price (₹)"
            value={planPrice}
            onChange={setPlanPrice}
            placeholder="499"
            type="number"
          />
          <SelectField
            label="Interval"
            value={planInterval}
            onChange={setPlanInterval}
            options={[
              { label: "Monthly", value: "monthly" },
              { label: "Quarterly", value: "quarterly" },
              { label: "Annual", value: "annual" },
              { label: "None (free / trial)", value: "none" },
            ]}
          />
          <Field
            label="Storage (GB)"
            value={planStorageGb}
            onChange={setPlanStorageGb}
            placeholder="10"
            type="number"
          />
          <Field
            label="Max Folders"
            value={planMaxFolders}
            onChange={setPlanMaxFolders}
            placeholder="10"
            type="number"
          />
          <Field
            label="Max Files / Folder"
            value={planMaxFiles}
            onChange={setPlanMaxFiles}
            placeholder="20"
            type="number"
          />
          <Field
            label="Description"
            value={planDesc}
            onChange={setPlanDesc}
            placeholder="For solo professionals."
            fullWidth
          />
        </ApiCard>

        {/* Update plan */}
        <ApiCard
          title="Update Plan (price / quotas)"
          method="PUT"
          endpoint="/api/admin/v1/plans/:id"
          description="Edits a plan and bumps its version. Reuses the Create Plan fields above — only non-empty ones are sent. Active subscribers are unaffected (grandfathered)."
          buttonLabel="Update"
          onSubmit={() => adminApi.updatePlan(planId.trim(), buildPlanUpdate())}
        >
          <Field
            label="Plan ID"
            value={planId}
            onChange={setPlanId}
            placeholder="MongoDB ObjectId of the plan"
            fullWidth
          />
        </ApiCard>

        {/* Activate / deactivate plan */}
        <ApiCard
          title="Activate / Deactivate Plan"
          method="PATCH"
          endpoint="/api/admin/v1/plans/:id/status"
          description="Soft enable/disable a plan without deleting it (preserves references)."
          buttonLabel="Set Status"
          onSubmit={() =>
            adminApi.setPlanStatus(planId.trim(), planActive === "true")
          }
        >
          <Field
            label="Plan ID"
            value={planId}
            onChange={setPlanId}
            placeholder="MongoDB ObjectId of the plan"
            fullWidth
          />
          <SelectField
            label="Status"
            value={planActive}
            onChange={setPlanActive}
            options={[
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" },
            ]}
          />
        </ApiCard>

        {/* --- Statistics (Super Admin) --- */}
        <div className="pt-3 pb-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Statistics · Super Admin
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live platform stats from MongoDB (no paid API calls): users,
            subscription mix, paid revenue + monthly trend, and compliance (GST
            tracked; TDS/ITR/ROC not yet).
          </p>
        </div>

        {/* Overview */}
        <ApiCard
          title="Statistics Overview"
          method="GET"
          endpoint="/api/admin/v1/stats/overview"
          description="Full dashboard payload: users, subscriptions, revenue (incl. monthly trend) and compliance."
          buttonLabel="Fetch Stats"
          onSubmit={() =>
            adminApi.getStats(Number(statsActiveDays), Number(statsTrendMonths))
          }
        >
          <Field
            label="Active window (days)"
            value={statsActiveDays}
            onChange={setStatsActiveDays}
            placeholder="30"
            type="number"
          />
          <Field
            label="Trend months"
            value={statsTrendMonths}
            onChange={setStatsTrendMonths}
            placeholder="6"
            type="number"
          />
        </ApiCard>

        {/* Revenue */}
        <ApiCard
          title="Revenue & Trend"
          method="GET"
          endpoint="/api/admin/v1/stats/revenue"
          description="Revenue (₹): gross collected, refunded, net, by module, last 30 days, and a monthly trend."
          buttonLabel="Fetch Revenue"
          onSubmit={() => adminApi.getRevenueStats(Number(statsTrendMonths))}
        >
          <Field
            label="Trend months"
            value={statsTrendMonths}
            onChange={setStatsTrendMonths}
            placeholder="6"
            type="number"
          />
        </ApiCard>

        {/* --- Management actions (Super Admin) --- */}
        <div className="pt-3 pb-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Management Actions · Super Admin
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Destructive actions open a confirmation popup and (where required)
            ask for a reason. Every action is audit-logged with
            who/what/when/why.
          </p>
        </div>

        {/* List app users */}
        <ApiCard
          title="List App Users"
          method="GET"
          endpoint="/api/admin/v1/users"
          description="Paginated app users with block status + subscription summary. Search by phone, email or name."
          buttonLabel="Fetch Users"
          onSubmit={() =>
            adminApi.listAppUsers(Number(page), 10, mgSearch || undefined)
          }
        >
          <Field
            label="Search (optional)"
            value={mgSearch}
            onChange={setMgSearch}
            placeholder="Phone / email / name"
          />
          <Field
            label="Page"
            value={page}
            onChange={setPage}
            placeholder="1"
            type="number"
          />
        </ApiCard>

        {/* Block user */}
        <ApiCard
          title="Block User"
          method="PATCH"
          endpoint="/api/admin/v1/users/:userId/block"
          description="Blocks app access. Opens a confirmation popup requiring a reason."
          buttonLabel="Block"
          onSubmit={async () => {
            const r = await confirmAction({
              title: "Block user",
              message: `Block user ${mgUserId || "(no id)"}? They will immediately lose app access.`,
              requireReason: true,
            });
            if (!r.confirmed) return { cancelled: true };
            return adminApi.blockUser(mgUserId.trim(), r.reason);
          }}
        >
          <Field
            label="User ID"
            value={mgUserId}
            onChange={setMgUserId}
            placeholder="MongoDB ObjectId of user"
            fullWidth
          />
        </ApiCard>

        {/* Unblock user */}
        <ApiCard
          title="Unblock User"
          method="PATCH"
          endpoint="/api/admin/v1/users/:userId/unblock"
          description="Restores app access. Opens a confirmation popup (reason optional)."
          buttonLabel="Unblock"
          onSubmit={async () => {
            const r = await confirmAction({
              title: "Unblock user",
              message: `Restore access for user ${mgUserId || "(no id)"}?`,
            });
            if (!r.confirmed) return { cancelled: true };
            return adminApi.unblockUser(mgUserId.trim(), r.reason || undefined);
          }}
        >
          <Field
            label="User ID"
            value={mgUserId}
            onChange={setMgUserId}
            placeholder="MongoDB ObjectId of user"
            fullWidth
          />
        </ApiCard>

        {/* Cancel subscription */}
        <ApiCard
          title="Cancel Subscription"
          method="POST"
          endpoint="/api/admin/v1/users/:userId/cancel-subscription"
          description="Cancels the user's subscription. A cancellation reason is mandatory (entered in the popup)."
          buttonLabel="Cancel Subscription"
          onSubmit={async () => {
            const r = await confirmAction({
              title: "Cancel subscription",
              message: `Cancel the subscription for user ${mgUserId || "(no id)"}? This revokes their plan access.`,
              requireReason: true,
            });
            if (!r.confirmed) return { cancelled: true };
            return adminApi.cancelSubscription(mgUserId.trim(), r.reason);
          }}
        >
          <Field
            label="User ID"
            value={mgUserId}
            onChange={setMgUserId}
            placeholder="MongoDB ObjectId of user"
            fullWidth
          />
        </ApiCard>

        {/* Refund payment */}
        <ApiCard
          title="Process Refund"
          method="POST"
          endpoint="/api/admin/v1/payments/:paymentId/refund"
          description="Refunds via Razorpay. Leave amount blank for a full refund; enter ₹ for partial. Confirmation popup."
          buttonLabel="Refund"
          onSubmit={async () => {
            const r = await confirmAction({
              title: "Process refund",
              message: `Refund ${mgRefundAmount ? `₹${mgRefundAmount}` : "the full amount"} for payment ${mgPaymentId || "(no id)"}?`,
              requireReason: false,
            });
            if (!r.confirmed) return { cancelled: true };
            return adminApi.refundPayment(
              mgPaymentId.trim(),
              mgRefundAmount ? Number(mgRefundAmount) : undefined,
              r.reason || undefined,
            );
          }}
        >
          <Field
            label="Razorpay Payment ID"
            value={mgPaymentId}
            onChange={setMgPaymentId}
            placeholder="pay_xxx (or pay_mock_xxx)"
            fullWidth
          />
          <Field
            label="Amount ₹ (blank = full)"
            value={mgRefundAmount}
            onChange={setMgRefundAmount}
            placeholder="full refund"
            type="number"
          />
        </ApiCard>

        {/* Audit logs */}
        <ApiCard
          title="Audit Logs"
          method="GET"
          endpoint="/api/admin/v1/audit-logs"
          description="The management action trail (newest first). Optionally filter by action."
          buttonLabel="Fetch Logs"
          onSubmit={() =>
            adminApi.listAuditLogs(Number(page), 20, mgAuditAction || undefined)
          }
        >
          <SelectField
            label="Action (optional)"
            value={mgAuditAction}
            onChange={setMgAuditAction}
            options={[
              { label: "All", value: "" },
              { label: "Block user", value: "block_user" },
              { label: "Unblock user", value: "unblock_user" },
              { label: "Cancel subscription", value: "cancel_subscription" },
              { label: "Refund payment", value: "refund_payment" },
            ]}
          />
          <Field
            label="Page"
            value={page}
            onChange={setPage}
            placeholder="1"
            type="number"
          />
        </ApiCard>
      </div>

      {/* Confirmation + reason modal for destructive actions */}
      {confirm.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={dismissConfirm}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="font-semibold text-slate-800 text-sm">
                {confirm.title}
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-slate-600">{confirm.message}</p>
              {confirm.requireReason && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={confirm.reason}
                    onChange={(e) =>
                      setConfirm((s) => ({ ...s, reason: e.target.value }))
                    }
                    placeholder="Required — recorded in the audit log"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={dismissConfirm}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitConfirm}
                disabled={confirm.requireReason && !confirm.reason.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
