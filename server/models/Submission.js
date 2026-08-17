const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    severity: {
        type: String,
        enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
        required: true
    },
    category: { type: String, default: '' },
    description: { type: String, default: '' },
    fix: { type: String, default: '' },
    // "core" = Track 1 (security/code). "readiness" = Track 2 (production readiness).
    track: { type: String, enum: ["core", "readiness"], default: "core" }
});

// Manual-confirmation checklist items — things we can't verify
// automatically (e.g. "does your OAuth login actually complete"). Checked
// state is NOT stored here; the client persists that in localStorage.
const checklistItemSchema = new mongoose.Schema({
    id: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: '' }
}, { _id: false });

// {value, status} instead of a bare number so the UI can distinguish
// "scored", "no_data" (feature exists, but no input to work from), and
// "coming_soon" (feature isn't built yet) instead of showing a fabricated
// number for all three cases.
const scoreCategorySchema = new mongoose.Schema({
    value: { type: Number, default: null },
    status: {
        type: String,
        enum: ["scored", "no_data", "coming_soon"],
        default: "no_data"
    }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
    repoUrl: { type: String, default: '' },
    liveUrl: { type: String, default: '' },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    // "core" = Track 1 only. "production" = Track 1 + Track 2 readiness checks.
    auditMode: { type: String, enum: ["core", "production"], default: "core" },
    scores: {
        security: { type: scoreCategorySchema, default: () => ({}) },
        performance: { type: scoreCategorySchema, default: () => ({}) },
        codeQuality: { type: scoreCategorySchema, default: () => ({ status: "coming_soon" }) },
        uiUx: { type: scoreCategorySchema, default: () => ({ status: "coming_soon" }) },
        // Only populated when auditMode === "production". Deliberately
        // separate from security/overall — see scoring.js.
        readiness: { type: scoreCategorySchema, default: () => ({}) },
        overall: { type: Number, default: null }
    },
    // "scored" = we have an overall number. "insufficient_data" = neither
    // the repo nor the live URL produced anything usable to audit.
    auditStatus: {
        type: String,
        enum: ["scored", "insufficient_data"],
        default: "scored"
    },
    summary: { type: String, default: '' },
    findings: [findingSchema],
    positives: [String],
    checklist: [checklistItemSchema],
    meta: {
        techStack: [String],
        filesScanned: { type: Number, default: 0 },
        secretsFound: { type: Number, default: 0 },
        responseTime: { type: Number, default: null },
        httpsUsed: { type: Boolean, default: false }
    },
    isPublic: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Submission", submissionSchema);