import { client } from './client';

/*
 * Profile view + edit.
 *
 * The read and the image live on the LEGACY `/user` routes (businessAuth JWT) and
 * still work. Changing the saved email or mobile there does NOT: both
 * `/user/profile/contact/*` routes are compatibility stubs that answer a flat 409
 * `{ next: 'verify_contact' }` and send no code. The live flow is three calls on
 * the NEW identity session (personAuth): request → verify → commit, where only the
 * commit writes anything and it spends a single-use Class-A step-up.
 */
export const profileApi = {
  get: () =>
    client.get('/user/profile'),

  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return client.post('/user/profile/image', form);
  },

  removeImage: () =>
    client.delete('/user/profile/image'),

  /* ── The live contact change (identityAuthRoutes) ─────────────────────── */

  // One channel per call. Stages a replacement and sends a code to THAT target;
  // the saved contact is untouched. Repeating the same value resends.
  contactRequest: (payload: { field: 'email' | 'mobile'; value: string }) =>
    client.post('/auth/contact/request', payload),

  // Turns the code into a proofId bound to this contact, person, session and the
  // saved-contact revision. Still saves nothing.
  contactVerify: (payload: { challengeId: string; code: string }) =>
    client.post('/auth/contact/verify', payload),

  // The one atomic write: the exact verified value(s) with their proof id(s). Both
  // channels in one call when both changed. X-Step-Up carries the single-use token.
  contactCommit: (
    payload: { email?: string; mobile?: string; emailProofId?: string; mobileProofId?: string },
    stepUpToken?: string,
  ) =>
    client.post('/auth/contact/commit', payload, stepUpToken ? { headers: { 'X-Step-Up': stepUpToken } } : undefined),

  /* ── §8.5's step-up, for the commit above ─────────────────────────────── */

  // Texts a 6-digit code to the SESSION's own mobile.
  stepUpStart: (action: 'auth.email.change' | 'auth.mobile.change') =>
    client.post('/auth/step-up/start', { action }),

  // Returns the stepUpToken. Class A: bound to this one action and burned by the
  // commit that uses it, so a second commit needs a second code.
  stepUpVerify: (action: 'auth.email.change' | 'auth.mobile.change', code: string) =>
    client.post('/auth/step-up/verify', { action, code }),
};
