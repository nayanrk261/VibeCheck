const { z } = require("zod");

// Whitelists the shape of what /api/audit will accept. Rejects malformed
// input outright instead of letting it flow into parseGithubUrl / axios.
const auditSchema = z
  .object({
    repoUrl: z
      .string()
      .trim()
      .max(300)
      .url()
      .refine((val) => /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/i.test(val), {
        message: "repoUrl must be a valid github.com repository URL",
      })
      .optional()
      .or(z.literal("")),
    liveUrl: z.string().trim().max(300).url().optional().or(z.literal("")),
  })
  .refine((data) => (data.repoUrl && data.repoUrl.length > 0) || (data.liveUrl && data.liveUrl.length > 0), {
    message: "At least one of repoUrl or liveUrl is required",
  });

const validateAuditRequest = (req, res, next) => {
  const result = auditSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: result.error.issues.map((issue) => issue.message),
    });
  }

  req.body = result.data;
  next();
};

module.exports = { validateAuditRequest };