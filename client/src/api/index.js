import axios from 'axios';

// VITE_API_BASE_URL should be the backend origin with NO trailing slash and NO /api suffix,
// e.g. https://vibecheck-unae.onrender.com
// In development the variable is unset; the Vite proxy rewrites /api/* to localhost.
const _rawBase = import.meta.env.VITE_API_BASE_URL;
const API_BASE = _rawBase
  ? _rawBase.replace(/\/+$/, '') + '/api'  // strip trailing slash, append /api once
  : '/api';                                 // dev: Vite proxy handles /api → localhost

export const submitAudit = async (repoUrl, liveUrl, auditMode = 'core') => {
    const response = await axios.post(`${API_BASE}/audit`, {
        repoUrl,
        liveUrl,
        auditMode
    });
    return response.data;
};

export const getSubmission = async (id) => {
    const response = await axios.get(`${API_BASE}/submissions/${id}`);
    return response.data;
};

export const getRecentSubmissions = async (limit = 10) => {
    const response = await axios.get(`${API_BASE}/submissions`, {
        params: { limit }
    });
    return response.data;
};