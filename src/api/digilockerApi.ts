import { client } from './client';

export const digilockerApi = {
  verifyAccount:      (aadhaar_number?: string, mobile?: string) =>
    client.post('/digilocker/verify-account', { aadhaar_number, mobile }),

  initiateSession:    (doc_types: string[], redirect_url: string, flow: string) =>
    client.post('/digilocker/initiate-session', { doc_types, redirect_url, flow }),

  getSessionStatus:   (session_id: string) =>
    client.get(`/digilocker/session/${session_id}/status`),

  getUserProfile:     (session_id: string) =>
    client.get(`/digilocker/session/${session_id}/profile`),

  getDocument:        (session_id: string, doc_type: string) =>
    client.get(`/digilocker/session/${session_id}/document/${doc_type}`),
};
