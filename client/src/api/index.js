import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

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