import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { profileApi } from '@/api/profileApi';
import { UserCircle } from 'lucide-react';

/*
 * Profile section: view + edit. Name and image update immediately; changing the
 * email or phone requires OTP on each changed channel, and the change applies
 * only once ALL changed channels are verified.
 */
export default function ProfilePage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Profile"
        subtitle="View + edit the logged-in user's profile. Name / DOB / PAN are one-time onboarding inputs (read-only). The image updates immediately; email/phone changes are OTP-verified and apply only when every changed channel is verified."
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

        {/* Contact change (OTP) */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Change Email / Phone (OTP)</p>
          <p className="text-xs text-slate-400 mb-3">Send OTP to the new email and/or phone (only the field that changed), then verify. The change applies only when every changed channel is verified — if one is unverified, nothing updates.</p>
        </div>

        <ApiCard
          step={3}
          title="Request Contact OTP"
          method="POST"
          endpoint="/api/v1/user/profile/contact/request-otp"
          description="Send OTP to the new email and/or phone. Leave a field blank to keep it unchanged."
          buttonLabel="Send OTP"
          onSubmit={() =>
            profileApi.requestContactOtp({
              email: email || undefined,
              phone: phone || undefined,
            })
          }
        >
          <Field label="New Email" value={email} onChange={setEmail} placeholder="new@example.com" />
          <Field label="New Mobile" value={phone} onChange={setPhone} placeholder="9876543210" />
        </ApiCard>

        <ApiCard
          step={4}
          title="Verify Contact OTP"
          method="POST"
          endpoint="/api/v1/user/profile/contact/verify"
          description="Enter the OTP(s) received. Applies the change only when all changed channels are verified."
          buttonLabel="Verify"
          onSubmit={() =>
            profileApi.verifyContactOtp({
              emailOtp: emailOtp || undefined,
              phoneOtp: phoneOtp || undefined,
            })
          }
        >
          <Field label="Email OTP" value={emailOtp} onChange={setEmailOtp} placeholder="6-digit OTP" />
          <Field label="Mobile OTP" value={phoneOtp} onChange={setPhoneOtp} placeholder="6-digit OTP" />
        </ApiCard>
      </div>
    </div>
  );
}
