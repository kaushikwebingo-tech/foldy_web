import { client } from './client';

export const digilockerApi = {
  verifyAccount:      (aadhaar_number?: string, mobile?: string) =>
    client.post('/digilocker/verify-account', { aadhaar_number, mobile }),

  initiateSession:    (doc_types: string[], redirect_url: string, flow: string) =>
    client.post('/digilocker/sessions/init', { doc_types, redirect_url, flow }),

  getSessionStatus:   (session_id: string) =>
    client.get(`/digilocker/sessions/${session_id}/status`),

  getUserProfile:     (session_id: string) =>
    client.get(`/digilocker/sessions/${session_id}/profile`),

  getDocument:        (session_id: string, doc_type: string) =>
    client.get(`/digilocker/sessions/${session_id}/documents/${doc_type}`),

  // PUBLIC OAuth redirect target — DigiLocker/Sandbox sends the browser here.
  // Exposed for inspection; in the real flow the browser calls it, not the app.
  handleCallback:     (params: Record<string, string>) =>
    client.get('/digilocker/callback', { params }),
};
