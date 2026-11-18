import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiCard from "@/components/ApiCard";
import { Field } from "@/components/Field";
import PageHeader from "@/components/PageHeader";
import { authApi } from "@/api/authApi";
import { getToken, removeToken } from "@/lib/utils";
import { LogIn, CheckCircle2, LogOut, LayoutDashboard, KeyRound } from "lucide-react";

/* ─── Session, plan and profile of the signed-in person ───────────── */
function SessionCards() {
  const [sid, setSid] = useState("");

  return (
    <div className="space-y-4">
      <ApiCard
        step={1}
        title="Get Trial / Plan Status"
        method="GET"
        endpoint="/api/v1/user/plan-status"
        description="Returns the current subscription status for the authenticated user."
        onSubmit={() => authApi.getTrialStatus()}
      />

      <ApiCard
        step={2}
        title="Get My Profile"
        method="GET"
        endpoint="/api/v1/user/profile"
        description="Profile section for the logged-in user: name, dob/incorporation date, email, mobile, and PAN (masked to last 4)."
        onSubmit={() => authApi.getProfile()}
      />

      <ApiCard
        step={3}
        title="Active Sessions"
        method="GET"
        endpoint="/api/v1/user/sessions"
        description="Your OWN sessions on this token's account (current one flagged). A delegated session sees only that director's sessions on the company; the owner never sees directors' devices."
        onSubmit={() => authApi.listSessions()}
      />

      <ApiCard
        step={4}
        title="End One Session"
        method="DELETE"
        endpoint="/api/v1/user/sessions/:sid"
        description="Signs out one of your other sessions. 422 for the session you are using (use Logout), 404 for a sid that is not in your own list."
        buttonLabel="Sign Out Device"
        onSubmit={() => authApi.endSession(sid.trim())}
      >
        <Field
          label="Session ID (sid)"
          value={sid}
          onChange={setSid}
          placeholder="sessions[].sid"
          fullWidth
        />
      </ApiCard>

      <ApiCard
        step={5}
        title="Log Out Other Devices"
        method="POST"
        endpoint="/api/v1/user/sessions/logout-others"
        description="No body. Scope is fixed server-side to you: an owner signs out their own other devices (never a director's); a director signs out their other sessions on this company only."
        onSubmit={() => authApi.logoutOtherSessions()}
      />
    </div>
  );
}

/* Sign-in itself is the Identity page: /signup/* and /auth/login. */
function SignInElsewhere() {
  const navigate = useNavigate();

  return (
    <div className="mb-1 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
      Signing in happens on the <strong>Identity</strong> page — mobile signup,
      DigiLocker, and <code>POST /auth/login</code> with a username or mobile and
      a password. The cards below need a token, so sign in there first.
      <button
        onClick={() => navigate("/identity")}
        className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#1A73E8] hover:bg-[#1558C0] text-white text-xs font-semibold rounded-lg transition-colors"
      >
        <KeyRound size={14} />
        Go to Identity
      </button>
    </div>
  );
}

/* ─── Already-logged-in banner ─────────────────────────────────────── */
function AlreadyLoggedIn() {
  const navigate = useNavigate();
  const token = getToken()!;

  const handleLogout = async () => {
    // Revoke the JWT + end the session server-side, then clear locally.
    try {
      await authApi.logout();
    } catch {
      /* ignore — proceed with local logout */
    }
    removeToken();
    window.location.reload();
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Session & Plan"
        subtitle="Manage this browser's session."
        icon={<LogIn size={18} />}
        badge="Token"
        postmanSection="identity"
      />

      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-bold text-green-800 text-sm">
              You are already logged in
            </p>
            <p className="text-xs text-green-600">
              An active JWT session is stored in your browser.
            </p>
          </div>
        </div>

        <div className="bg-white border border-green-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
            Current Token
          </p>
          <code className="text-xs text-slate-700 break-all leading-5">
            {token.slice(0, 60)}…
          </code>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A73E8] hover:bg-[#1558C0] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <LayoutDashboard size={15} />
            Go to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-xl transition-colors"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>

      <SessionCards />
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────────── */
export default function LoginPage() {
  const loggedIn = !!getToken();
  if (loggedIn) return <AlreadyLoggedIn />;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Session & Plan"
        subtitle="Session, plan and profile of the signed-in person. Sign in on the Identity page."
        icon={<LogIn size={18} />}
        badge="Token"
        postmanSection="identity"
      />
      <SignInElsewhere />
      <div className="mt-4">
        <SessionCards />
      </div>
    </div>
  );
}
