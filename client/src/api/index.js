import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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