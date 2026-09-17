const axios = require('axios');

const parseGithubUrl = (url) => {
    if (!url || typeof url !== 'string') {
        throw new Error("Invalid Github url");
    }
    const cleaned = url.trim().replace(/\.git$/i, '').replace(/\/$/, '');
    const parts = cleaned.split("/");
    const repo = parts.pop();
    const owner = parts.pop();

    if (!owner || !repo || owner.includes(':') || repo.includes(':')) {
        throw new Error("Invalid Github url");
    }
    return { owner, repo };
};

const getGithubHeaders = () => {
    const headers = {
        'User-Agent': 'VibeCheck-App/1.0',
        'Accept': 'application/vnd.github.v3+json'
    };
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
};

const IGNORED_DIRECTORIES = new Set([
    "node_modules", ".git", "dist", "build", "coverage", "vendor",
    ".next", ".nuxt", "out", "target", "bin", "obj", ".venv", "venv",
    "__pycache__", ".idea", ".vscode", ".cache"
]);

const EXCLUDED_EXTENSIONS = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".tiff", ".bmp", ".psd",
    ".mp4", ".webm", ".mkv", ".avi", ".mov", ".mp3", ".wav", ".flac", ".ogg",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".exe", ".dll", ".so", ".dylib", ".bin", ".zip", ".tar", ".gz", ".7z", ".rar",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".pyc", ".class", ".db", ".sqlite", ".lock"
]);

const ALLOWED_EXTENSIONS = new Set([
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".json", ".json5", ".env",
    ".py", ".go", ".java", ".php", ".rb", ".rs",
    ".yaml", ".yml", ".dockerfile", ".sh", ".bash"
]);

const isRelevantFile = (filepath) => {
    if (!filepath || typeof filepath !== "string") return false;
    const normalized = filepath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const filename = parts[parts.length - 1];
    const lowerFilename = filename.toLowerCase();

    if (parts.length > 1) {
        const dirParts = parts.slice(0, -1);
        if (dirParts.some(part => IGNORED_DIRECTORIES.has(part.toLowerCase()))) {
            return false;
        }
    }

    if (lowerFilename === "dockerfile" || lowerFilename.startsWith("dockerfile.") || lowerFilename.startsWith(".env")) {
        return true;
    }

    const extMatch = lowerFilename.match(/\.[a-z0-9]+$/);
    if (!extMatch) {
        return false;
    }

    const ext = extMatch[0];
    if (EXCLUDED_EXTENSIONS.has(ext)) {
        return false;
    }

    return ALLOWED_EXTENSIONS.has(ext);
};

const fetchRepoTree = async (owner, repo) => {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;

    const response = await axios.get(url, { headers: getGithubHeaders() });
    const tree = response.data.tree || [];

    const discoveredBlobs = tree.filter(item => item.type === "blob");
    const discoveredCount = discoveredBlobs.length;

    const files = discoveredBlobs.filter((item) => isRelevantFile(item.path));
    files.discoveredCount = discoveredCount;
    return files;
};

const fetchFileContent = async (owner, repo, filepath) => {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${filepath}`;
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await axios.get(url, { headers });
    return response.data;
};

const detectTechStack = (files) => {
    const filepaths = files.map((file) => (typeof file === 'string' ? file : file?.path || ''));
    const stack = [];

    if (filepaths.some((p) => p.endsWith(".jsx") || p.endsWith(".tsx"))) {
        stack.push("React");
    }
    if (filepaths.some((p) => p.endsWith(".ts") || p.endsWith(".tsx"))) {
        stack.push("TypeScript");
    }
    if (filepaths.some((p) => p.includes("tailwind.config"))) {
        stack.push("Tailwind CSS");
    }
    if (filepaths.some((p) => p.includes("next.config"))) {
        stack.push("Next.js");
    }
    if (filepaths.some((p) => p.includes("prisma"))) {
        stack.push("Prisma");
    }
    if (filepaths.some((p) => p.endsWith(".py"))) {
        stack.push("Python");
    }
    if (filepaths.some((p) => p.endsWith(".go"))) {
        stack.push("Go");
    }
    if (filepaths.some((p) => p.endsWith(".java"))) {
        stack.push("Java");
    }
    if (filepaths.some((p) => p.endsWith(".php"))) {
        stack.push("PHP");
    }
    if (filepaths.some((p) => p.endsWith(".rb"))) {
        stack.push("Ruby");
    }
    if (filepaths.some((p) => p.endsWith(".rs"))) {
        stack.push("Rust");
    }
    if (filepaths.some((p) => p.toLowerCase().includes("dockerfile"))) {
        stack.push("Docker");
    }
    return stack;
};

module.exports = {
    parseGithubUrl,
    fetchRepoTree,
    fetchFileContent,
    detectTechStack,
    isRelevantFile,
    IGNORED_DIRECTORIES,
    EXCLUDED_EXTENSIONS,
    ALLOWED_EXTENSIONS
};