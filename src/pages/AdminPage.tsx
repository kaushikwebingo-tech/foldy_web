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

  // Notifications (Super Admin)
  const [ntfTitle, setNtfTitle] = useState("");
  const [ntfMessage, setNtfMessage] = useState("");
  const [ntfUserId, setNtfUserId] = useState("");
  const [ntfAudience, setNtfAudience] = useState("");

  // Feature flags / kill-switches
  const [featId, setFeatId] = useState("");
  const [featTitle, setFeatTitle] = useState("");
  const [featProvider, setFeatProvider] = useState("");
  const [featRedisKey, setFeatRedisKey] = useState("");
  const [featStatus, setFeatStatus] = useState("operational");
  const [featKill, setFeatKill] = useState("true");
  const [featDesc, setFeatDesc] = useState("");

  // Calendar (compliance / events)
  const [calId, setCalId] = useState("");
  const [calMonth, setCalMonth] = useState("");
  const [calTitle, setCalTitle] = useState("");
  const [calDate, setCalDate] = useState("");
  const [calStart, setCalStart] = useState("09:00");
  const [calEnd, setCalEnd] = useState("10:00");
  const [calStatus, setCalStatus] = useState("pending");
  const [calType, setCalType] = useState("event");
  const [calModule, setCalModule] = useState(""); // GST/TDS/ROC/ITR or "" (none, e.g. holiday)
  const [calTargetMonth, setCalTargetMonth] = useState("");
  const [calSheet, setCalSheet] = useState<File | null>(null);
  const [calDryRun, setCalDryRun] = useState("true");

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
          step={1}
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
          step={2}
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
          step={3}
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
          step={4}
          title="List Plans"
          method="GET"
          endpoint="/api/admin/v1/plans"
          description="Returns the full plan catalog (active + inactive) with price, interval and quotas."
          onSubmit={() => adminApi.listPlans()}
        />

        {/* Create plan */}
        <ApiCard
          step={5}
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
          step={6}
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
          step={7}
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
          step={8}
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
          step={9}
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
          step={10}
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

        {/* Get user details */}
        <ApiCard
          step={11}
          title="Get User Details"
          method="GET"
          endpoint="/api/admin/v1/users/:userId"
          description="Full per-user view: profile, subscription/plan, storage usage (used/available), and recent payments."
          buttonLabel="Fetch Details"
          onSubmit={() => adminApi.getUserDetails(mgUserId.trim())}
        >
          <Field
            label="User ID"
            value={mgUserId}
            onChange={setMgUserId}
            placeholder="<userId>"
            fullWidth
          />
        </ApiCard>

        {/* Block user */}
        <ApiCard
          step={12}
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
          step={13}
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
          step={14}
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
          step={15}
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
          step={16}
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

        {/* --- Notifications (Super Admin) --- */}
        <div className="pt-3 pb-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Notifications · Super Admin
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Push messages via OneSignal. Broadcast to all subscribed devices, or
            send to one user by id. Every send is recorded to the notification
            history below.
          </p>
        </div>

        {/* Broadcast */}
        <ApiCard
          step={17}
          title="Broadcast Notification"
          method="POST"
          endpoint="/api/admin/v1/notifications/broadcast"
          description="Sends a push to every subscribed device (OneSignal 'Subscribed Users' segment)."
          buttonLabel="Broadcast"
          onSubmit={() =>
            adminApi.broadcastNotification(ntfTitle.trim(), ntfMessage.trim())
          }
        >
          <Field
            label="Title"
            value={ntfTitle}
            onChange={setNtfTitle}
            placeholder="Scheduled maintenance"
          />
          <Field
            label="Message"
            value={ntfMessage}
            onChange={setNtfMessage}
            placeholder="Foldy will be briefly unavailable tonight at 11 PM IST."
            fullWidth
          />
        </ApiCard>

        {/* Send to user */}
        <ApiCard
          step={18}
          title="Send Notification to User"
          method="POST"
          endpoint="/api/admin/v1/notifications/users/:userId"
          description="Sends a push to one app user. Targets by external id (userId), falling back to the user's stored device token."
          buttonLabel="Send"
          onSubmit={() =>
            adminApi.sendUserNotification(
              ntfUserId.trim(),
              ntfTitle.trim(),
              ntfMessage.trim(),
            )
          }
        >
          <Field
            label="User ID"
            value={ntfUserId}
            onChange={setNtfUserId}
            placeholder="MongoDB ObjectId of the user"
            fullWidth
          />
          <Field
            label="Title"
            value={ntfTitle}
            onChange={setNtfTitle}
            placeholder="Your GST return is due"
          />
          <Field
            label="Message"
            value={ntfMessage}
            onChange={setNtfMessage}
            placeholder="GSTR-1 for 06-2026 is due in 3 days."
            fullWidth
          />
        </ApiCard>

        {/* Notification history */}
        <ApiCard
          step={19}
          title="Notification History"
          method="GET"
          endpoint="/api/admin/v1/notifications"
          description="Paginated history of sent notifications (newest first). Optionally filter by audience."
          buttonLabel="Fetch History"
          onSubmit={() =>
            adminApi.listNotifications(
              Number(page),
              20,
              (ntfAudience || undefined) as "broadcast" | "user" | undefined,
            )
          }
        >
          <SelectField
            label="Audience (optional)"
            value={ntfAudience}
            onChange={setNtfAudience}
            options={[
              { label: "All", value: "" },
              { label: "Broadcast", value: "broadcast" },
              { label: "Direct (user)", value: "user" },
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

        {/* ---------- Feature flags / kill-switches ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">
          Feature flags · kill-switches (error provider)
        </p>

        <ApiCard
          title="List Features"
          method="GET"
          endpoint="/api/admin/v1/features"
          description="All feature flags with their status (operational / disabled-manual / api-error-auto) and killSwitch."
          onSubmit={() => adminApi.listFeatures()}
        />

        <ApiCard
          title="Create Feature"
          method="POST"
          endpoint="/api/admin/v1/features"
          description="Register a feature flag. redisKey is what the error-provider middleware reads (e.g. killswitch:provider:whitebooks-gst)."
          onSubmit={() =>
            adminApi.createFeature({
              title: featTitle,
              apiProvider: featProvider,
              ...(featRedisKey ? { redisKey: featRedisKey } : {}),
              status: featStatus,
              killSwitch: featKill === "true",
              ...(featDesc ? { description: featDesc } : {}),
            })
          }
        >
          <Field label="Title" value={featTitle} onChange={setFeatTitle} placeholder="Whitebooks GST" />
          <Field label="API Provider" value={featProvider} onChange={setFeatProvider} placeholder="whitebooks" />
          <Field label="Redis Key (optional)" value={featRedisKey} onChange={setFeatRedisKey} placeholder="killswitch:provider:whitebooks-gst" fullWidth />
          <SelectField
            label="Status"
            value={featStatus}
            onChange={setFeatStatus}
            options={[
              { label: "operational", value: "operational" },
              { label: "disabled-manual", value: "disabled-manual" },
              { label: "api-error-auto", value: "api-error-auto" },
            ]}
          />
          <SelectField
            label="Kill Switch (on = usable)"
            value={featKill}
            onChange={setFeatKill}
            options={[
              { label: "true (on)", value: "true" },
              { label: "false (off)", value: "false" },
            ]}
          />
          <Field label="Description (optional)" value={featDesc} onChange={setFeatDesc} placeholder="" fullWidth />
        </ApiCard>

        <ApiCard
          title="Toggle Feature (kill-switch)"
          method="PATCH"
          endpoint="/api/admin/v1/features/:id/toggle"
          description="Turn a feature on/off. REQUIRES a killSwitch body (this was previously out of sync). Optionally set the status too."
          onSubmit={() => adminApi.toggleFeature(featId, featKill === "true", featStatus)}
        >
          <Field label="Feature ID" value={featId} onChange={setFeatId} placeholder="feature _id" fullWidth />
          <SelectField
            label="Kill Switch"
            value={featKill}
            onChange={setFeatKill}
            options={[
              { label: "true (on)", value: "true" },
              { label: "false (off)", value: "false" },
            ]}
          />
        </ApiCard>

        <ApiCard
          title="Update Feature"
          method="PUT"
          endpoint="/api/admin/v1/features/:id"
          description="Edit a feature's fields (title / apiProvider / redisKey / status / description)."
          onSubmit={() =>
            adminApi.updateFeature(featId, {
              ...(featTitle ? { title: featTitle } : {}),
              ...(featProvider ? { apiProvider: featProvider } : {}),
              ...(featRedisKey ? { redisKey: featRedisKey } : {}),
              status: featStatus,
              killSwitch: featKill === "true",
              ...(featDesc ? { description: featDesc } : {}),
            })
          }
        >
          <Field label="Feature ID" value={featId} onChange={setFeatId} placeholder="feature _id" fullWidth />
        </ApiCard>

        <ApiCard
          title="Delete Feature"
          method="DELETE"
          endpoint="/api/admin/v1/features/:id"
          description="Remove a feature flag."
          onSubmit={() => adminApi.deleteFeature(featId)}
        >
          <Field label="Feature ID" value={featId} onChange={setFeatId} placeholder="feature _id" fullWidth />
        </ApiCard>

        {/* ---------- Calendar (compliance / events) ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">
          Calendar · compliance / events (admin CRUD)
        </p>

        <ApiCard
          title="List Calendar Events"
          method="GET"
          endpoint="/api/admin/v1/calendar"
          description="All events, optionally filtered to one month (YYYY-MM)."
          onSubmit={() => adminApi.listCalendarEvents(calMonth || undefined)}
        >
          <Field label="Month (optional)" value={calMonth} onChange={setCalMonth} placeholder="2026-07" />
        </ApiCard>

        <ApiCard
          title="Create Calendar Event"
          method="POST"
          endpoint="/api/admin/v1/calendar"
          description="Add a compliance / general / holiday event. Date YYYY-MM-DD, times HH:mm. Holidays render red; leave Module blank for a holiday."
          onSubmit={() =>
            adminApi.createCalendarEvent({
              title: calTitle,
              date: calDate,
              timeStart: calStart,
              timeEnd: calEnd,
              status: calStatus,
              eventType: calType,
              module: calModule,
            })
          }
        >
          <Field label="Title" value={calTitle} onChange={setCalTitle} placeholder="GSTR-1 due" />
          <Field label="Date (YYYY-MM-DD)" value={calDate} onChange={setCalDate} placeholder="2026-07-11" />
          <Field label="Start (HH:mm)" value={calStart} onChange={setCalStart} placeholder="09:00" />
          <Field label="End (HH:mm)" value={calEnd} onChange={setCalEnd} placeholder="10:00" />
          <SelectField
            label="Status"
            value={calStatus}
            onChange={setCalStatus}
            options={[
              { label: "pending", value: "pending" },
              { label: "approval", value: "approval" },
              { label: "reschedule", value: "reschedule" },
              { label: "cancel", value: "cancel" },
            ]}
          />
          <SelectField
            label="Type"
            value={calType}
            onChange={setCalType}
            options={[
              { label: "event", value: "event" },
              { label: "compliance", value: "compliance" },
              { label: "holiday (red)", value: "holiday" },
            ]}
          />
          <SelectField
            label="Module (optional — blank for holiday)"
            value={calModule}
            onChange={setCalModule}
            options={[
              { label: "— none —", value: "" },
              { label: "GST", value: "GST" },
              { label: "TDS", value: "TDS" },
              { label: "ROC", value: "ROC" },
              { label: "ITR", value: "ITR" },
            ]}
          />
        </ApiCard>

        <ApiCard
          title="Update Calendar Event"
          method="PUT"
          endpoint="/api/admin/v1/calendar/:id"
          description="Edit an event (any subset of fields). Sends the current Type/Module/Status picks from the Create card above; blank Module clears it (e.g. switching to a holiday)."
          onSubmit={() =>
            adminApi.updateCalendarEvent(calId, {
              ...(calTitle ? { title: calTitle } : {}),
              ...(calDate ? { date: calDate } : {}),
              status: calStatus,
              eventType: calType,
              module: calModule,
            })
          }
        >
          <Field label="Event ID" value={calId} onChange={setCalId} placeholder="event _id" fullWidth />
        </ApiCard>

        <ApiCard
          title="Delete Calendar Event"
          method="DELETE"
          endpoint="/api/admin/v1/calendar/:id"
          description="Remove an event."
          onSubmit={() => adminApi.deleteCalendarEvent(calId)}
        >
          <Field label="Event ID" value={calId} onChange={setCalId} placeholder="event _id" fullWidth />
        </ApiCard>

        <ApiCard
          title="Import Previous Year"
          method="POST"
          endpoint="/api/admin/v1/calendar/import-previous-year"
          description="Clone a whole month's compliance events from the previous year into the target month (YYYY-MM)."
          onSubmit={() => adminApi.importCalendarFromPreviousYear(calTargetMonth)}
        >
          <Field label="Target Month (YYYY-MM)" value={calTargetMonth} onChange={setCalTargetMonth} placeholder="2026-07" fullWidth />
        </ApiCard>

        <ApiCard
          title="Download Import Template"
          method="GET"
          endpoint="/api/admin/v1/calendar/import/template"
          description="Sample .xlsx an admin fills in: an Events sheet with the exact headings the importer expects, plus an Instructions tab. Returns a binary file, so the response below is a Blob."
          onSubmit={() => adminApi.downloadCalendarImportTemplate()}
        />

        <ApiCard
          title="Import Events from Spreadsheet"
          method="POST"
          endpoint="/api/admin/v1/calendar/import"
          description="Bulk-import a year of events from .xlsx/.xls/.csv (max 5MB). Required columns: Title, Date, Module (GST/TDS/ROC/ITR or NONE). All-or-nothing: any invalid row, any duplicate inside the file, or any event that already exists (same title + date) rejects the whole upload with a row-by-row report and writes nothing. Use dryRun to validate and preview first."
          onSubmit={() => {
            if (!calSheet) return Promise.reject(new Error("Choose a spreadsheet first."));
            return adminApi.importCalendarSheet(calSheet, calDryRun === "true");
          }}
        >
          <label className="block w-full">
            <span className="block text-xs font-medium text-slate-600 mb-1">Spreadsheet (.xlsx / .xls / .csv)</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setCalSheet(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </label>
          <Field label="dryRun (true = validate only)" value={calDryRun} onChange={setCalDryRun} placeholder="true" fullWidth />
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
