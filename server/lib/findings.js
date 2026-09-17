// analyzeHeaders() (lib/headers.js) produces findings shaped for internal
// use ({type, header, description, fix}). This maps them into the standard
// report shape ({title, severity, category, description, fix}) used by
// every other finding source, so the controller can merge them all
// deterministically instead of relying on the AI to restate them.
function mapHeaderFindings(headerData) {
    if (!headerData || headerData.error || !headerData.findings) return [];

    return headerData.findings.map((f) => {
        let category = "Headers";
        let title = f.type;

        if (f.type === "Missing Security Header") {
            title = `Missing ${f.header} header`;
        } else if (f.type === "No HTTPS") {
            category = "Transport Security";
        } else if (f.type === "Slow Response Time") {
            category = "Performance";
        } else if (f.type === "Information Disclosure") {
            category = "Information Disclosure";
            title = `Server discloses tech stack via ${f.header}`;
        }

        const evidence = f.type === "Missing Security Header"
            ? `Missing ${f.header} response header`
            : f.description;

        return {
            title,
            severity: f.severity,
            category,
            description: f.description,
            fix: f.fix,
            file: null,
            line: null,
            column: null,
            evidence,
            confidence: "HIGH",
            status: "CONFIRMED"
        };
    });
}

module.exports = { mapHeaderFindings };