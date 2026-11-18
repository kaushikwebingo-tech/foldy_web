import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { profileApi } from '@/api/profileApi';
import { UserCircle } from 'lucide-react';

type ContactField = 'email' | 'mobile';
type StepUpAction = 'auth.email.change' | 'auth.mobile.change';

const CONTACT_FIELDS = [
  { label: 'email', value: 'email' },
  { label: 'mobile', value: 'mobile' },
];

/** One string off an envelope body (`data.data`), as IdentityPage does it. */
function pick(res: unknown, key: string): string | undefined {
  const body = (res as { data?: { data?: Record<string, unknown> } })?.data?.data;
  const v = body && typeof body === 'object' ? body[key] : undefined;
  return typeof v === 'string' && v ? v : undefined;
}

/*
 * Profile section: view + edit. Backend: server/src/routes/app/v1/userRoutes.ts
 * (legacy `businessAuth` JWT) for the read and the image, and identityAuthRoutes
 * for the contact change — TWO DIFFERENT SESSIONS on one page.
 *
 * The saved email / mobile do NOT change on /user/profile/contact/*: those two
 * routes are compatibility stubs that answer a flat 409 { next: 'verify_contact' }
 * and send no code. The live flow is request → verify → commit on the new
 * identity session: the first two stage and prove a replacement without saving
 * anything, and the commit is the one atomic write — it needs the exact verified
 * value plus its proofId, and (for a mobile, or an email that was already
 * verified) a single-use Class-A X-Step-Up token.
 */
export default function ProfilePage() {
  const [imageFile, setImageFile] = useState<File | null>(null);

  // The live contact change: one channel at a time through request → verify,
  // then ONE commit carrying whatever was proved.
  const [field, setField] = useState<ContactField>('email');
  const [value, setValue] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [emailProofId, setEmailProofId] = useState('');
  const [mobileValue, setMobileValue] = useState('');
  const [mobileProofId, setMobileProofId] = useState('');

  // §8.5's step-up for the commit. Class A, so this token is spent by the first
  // commit that uses it and the next one needs a fresh code.
  const [stepUpCode, setStepUpCode] = useState('');
  const [stepUpToken, setStepUpToken] = useState('');
  const stepUpAction: StepUpAction = mobileValue.trim() ? 'auth.mobile.change' : 'auth.email.change';

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Profile"
        subtitle="View + edit the logged-in person's profile. Name / DOB / PAN are one-time onboarding inputs (read-only). The image updates immediately. A saved email or mobile changes only through /auth/contact/request → /verify → /commit, and only the commit writes."
        icon={<UserCircle size={18} />}
        postmanSection="profile"
      />

      <div className="space-y-4">
        <ApiCard
          step={1}
          title="Get Profile"
          method="GET"
          endpoint="/api/v1/user/profile"
          description="Name, DOB, email, mobile, masked PAN, and a signed profile-image URL. (Name/DOB/PAN are read-only.)"
          onSubmit={() => profileApi.get()}
        />

        <ApiCard
          step={2}
          title="Upload Profile Image"
          method="POST"
          endpoint="/api/v1/user/profile/image"
          description="JPG/PNG/WEBP, ≤5MB. Uploaded to S3; returns a signed image URL. No OTP."
          buttonLabel="Upload"
          onSubmit={() => {
            if (!imageFile) throw new Error('Choose an image file first.');
            return profileApi.uploadImage(imageFile);
          }}
        >
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Image (jpg / png / webp)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1A73E8] file:text-white hover:file:bg-[#1558C0]"
            />
          </div>
        </ApiCard>

        <ApiCard
          title="Remove Profile Image"
          method="DELETE"
          endpoint="/api/v1/user/profile/image"
          description="Removes the current profile image."
          buttonLabel="Remove"
          onSubmit={() => profileApi.removeImage()}
        />

        {/* The live contact change — NEW identity session, not the legacy JWT */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Change Email / Mobile (request → verify → commit)</p>
          <p className="text-xs text-slate-400 mb-3">
            These three run on the NEW identity session ({'{{token}}'} from Identity → Sign In), not the legacy JWT the cards above use. Request and verify save NOTHING — they stage a replacement and turn its code into a proofId. The commit is the one atomic write: it takes the exact verified value with its proofId, refuses a contact that belongs to another account (409), and is rejected as stale if the saved contacts moved underneath it. The retired
            {' '}<code className="text-[11px]">/user/profile/contact/request-otp</code> and <code className="text-[11px]">/verify</code> answer a flat 409 and send no code.
          </p>
        </div>

        <ApiCard
          step={3}
          title="Request Replacement Code"
          method="POST"
          endpoint="/api/v1/auth/contact/request"
          description="Closed body { field: email | mobile, value }. Stages that ONE channel and sends a code to the NEW target; the saved contact is untouched and no step-up is needed yet. Asking again for the same value resends it (cool-off and resend caps apply, 429). Copy data.challengeId into the next card, and data.maskedTarget is what the app shows. A proof is bound to this session and to the saved contacts as they are now — editing the saved email or mobile elsewhere invalidates it."
          buttonLabel="Send Code"
          onSubmit={async () => {
            const res = await profileApi.contactRequest({ field, value: value.trim() });
            const id = pick(res, 'challengeId');
            if (id) setChallengeId(id);
            if (field === 'email') setEmailValue(value.trim());
            else setMobileValue(value.trim());
            return res;
          }}
        >
          <SelectField label="Field" value={field} onChange={(v) => setField(v as ContactField)} options={CONTACT_FIELDS} />
          <Field label="New value" value={value} onChange={setValue} placeholder={field === 'email' ? 'new@example.com' : '9876543210'} />
        </ApiCard>

        <ApiCard
          step={4}
          title="Verify Replacement Code"
          method="POST"
          endpoint="/api/v1/auth/contact/verify"
          description="Closed body { challengeId, code } — the code is 6 digits. Turns the code into a proofId that is good for a few minutes and still saves nothing; a wrong code is 422, never 401. The proofId lands in the matching field below, so proving an email and then a mobile leaves BOTH ready for one commit."
          buttonLabel="Verify"
          onSubmit={async () => {
            const res = await profileApi.contactVerify({ challengeId: challengeId.trim(), code: code.trim() });
            const proof = pick(res, 'proofId');
            if (proof) {
              if (pick(res, 'field') === 'mobile') setMobileProofId(proof);
              else setEmailProofId(proof);
            }
            return res;
          }}
        >
          <Field label="challengeId" value={challengeId} onChange={setChallengeId} placeholder="from the card above" fullWidth />
          <Field label="Code" value={code} onChange={setCode} placeholder="6 digits" />
        </ApiCard>

        <ApiCard
          title="Step-Up for the Commit"
          method="POST"
          endpoint={stepUpCode.trim() ? '/api/v1/auth/step-up/verify' : '/api/v1/auth/step-up/start'}
          description={`Leave Code empty and press Send code: the server texts a 6-digit code to the SESSION's own mobile for ${stepUpAction} (chosen from whether a mobile is being committed). Then type the code and press Verify: the stepUpToken is kept in page state and the commit sends it as X-Step-Up. Class A — bound to that one action and BURNED by the commit that spends it, so a second commit needs a second code. A first email verification inside the signup grace window needs none.`}
          buttonLabel={stepUpCode.trim() ? 'Verify' : 'Send code'}
          onSubmit={async () => {
            if (!stepUpCode.trim()) return profileApi.stepUpStart(stepUpAction);
            const res = await profileApi.stepUpVerify(stepUpAction, stepUpCode.trim());
            const token = pick(res, 'stepUpToken');
            if (token) setStepUpToken(token);
            return res;
          }}
        >
          <Field label="Code" value={stepUpCode} onChange={setStepUpCode} placeholder="blank → send, 6 digits → verify" />
          <Field label="stepUpToken (held)" value={stepUpToken} onChange={setStepUpToken} placeholder="none held — the commit will answer 403 AUTH_STEP_UP_REQUIRED" fullWidth />
        </ApiCard>

        <ApiCard
          step={5}
          title="Commit Verified Contact"
          method="POST"
          endpoint="/api/v1/auth/contact/commit"
          description="The one write. Send the exact value(s) proved above with their proofId(s) — both channels in ONE call when both changed, so the profile never half-applies. A value that is already saved is a no-op success (a lost response can be retried without another code). Refusals: 422 for a missing, expired, mismatched or already-spent proof; 422 stale when the saved contacts moved since the proof; 409 when the contact belongs to another Foldy account; 403 AUTH_STEP_UP_REQUIRED without the header; 429 while the action is cooling down. A committed MOBILE also ends every other session and revokes every other device's trust, and the old number is told."
          buttonLabel="Commit"
          onSubmit={() =>
            profileApi.contactCommit(
              {
                ...(emailValue.trim() ? { email: emailValue.trim() } : {}),
                ...(emailProofId.trim() ? { emailProofId: emailProofId.trim() } : {}),
                ...(mobileValue.trim() ? { mobile: mobileValue.trim() } : {}),
                ...(mobileProofId.trim() ? { mobileProofId: mobileProofId.trim() } : {}),
              },
              stepUpToken.trim() || undefined,
            )
          }
        >
          <Field label="email (verified)" value={emailValue} onChange={setEmailValue} placeholder="blank → not changed" />
          <Field label="emailProofId" value={emailProofId} onChange={setEmailProofId} placeholder="from Verify" />
          <Field label="mobile (verified)" value={mobileValue} onChange={setMobileValue} placeholder="blank → not changed" />
          <Field label="mobileProofId" value={mobileProofId} onChange={setMobileProofId} placeholder="from Verify" />
        </ApiCard>
      </div>
    </div>
  );
}
