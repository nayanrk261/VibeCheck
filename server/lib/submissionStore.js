const mongoose = require('mongoose');
const Submission = require('../models/Submission');

const inMemoryStore = new Map();

/**
 * Saves a Submission document to MongoDB if connected, or to the in-memory fallback store.
 */
async function saveSubmission(submissionData) {
    const submission = new Submission(submissionData);
    const key = submission._id ? submission._id.toString() : new mongoose.Types.ObjectId().toString();
    submission._id = key;

    if (mongoose.connection.readyState === 1) {
        try {
            await submission.save();
            return submission;
        } catch (err) {
            console.error("MongoDB save failed, storing in memory:", err.message);
        }
    }

    // Fallback in-memory storage when DB is disconnected
    const docObj = submission.toObject ? submission.toObject() : submission;
    docObj._id = key;
    inMemoryStore.set(key, docObj);
    return docObj;
}

/**
 * Retrieves a submission by ID from MongoDB or the in-memory fallback store.
 */
async function getSubmissionById(id) {
    const key = id ? id.toString() : '';

    if (mongoose.connection.readyState === 1) {
        try {
            const submission = await Submission.findById(key);
            if (submission) return submission;
        } catch (err) {
            if (err.name === "CastError") throw err;
            console.error("MongoDB lookup failed, checking in-memory store:", err.message);
        }
    }

    if (inMemoryStore.has(key)) {
        return inMemoryStore.get(key);
    }

    return null;
}

/**
 * Format a submission object into a safe summary suitable for listing.
 * Excludes raw repository content, secrets, full evidence snippets, and DB details.
 */
function formatSafeSummary(doc) {
    const d = doc.toObject ? doc.toObject() : doc;
    return {
        _id: d._id ? d._id.toString() : '',
        repoUrl: d.repoUrl || '',
        liveUrl: d.liveUrl || '',
        auditMode: d.auditMode || 'core',
        scores: d.scores || {},
        auditStatus: d.auditStatus || 'scored',
        createdAt: d.createdAt || new Date(),
        meta: {
            techStack: d.meta?.techStack || [],
            filesScanned: d.meta?.filesScanned || 0,
            secretsFound: d.meta?.secretsFound || 0
        },
        findingsCount: Array.isArray(d.findings) ? d.findings.length : 0
    };
}

/**
 * Retrieves recent completed submissions ordered newest first.
 */
async function getRecentSubmissions(limit = 10) {
    const numLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    if (mongoose.connection.readyState === 1) {
        try {
            const list = await Submission.find({}, '_id repoUrl liveUrl auditMode scores auditStatus createdAt meta findings')
                .sort({ createdAt: -1, _id: -1 })
                .limit(numLimit)
                .lean();
            return list.map(formatSafeSummary);
        } catch (err) {
            console.error("MongoDB list failed, checking in-memory store:", err.message);
        }
    }

    const items = Array.from(inMemoryStore.values())
        .sort((a, b) => {
            const timeDiff = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            if (timeDiff !== 0) return timeDiff;
            return (b._id || '').toString().localeCompare((a._id || '').toString());
        })
        .slice(0, numLimit);
    return items.map(formatSafeSummary);
}

module.exports = {
    saveSubmission,
    getSubmissionById,
    getRecentSubmissions
};
