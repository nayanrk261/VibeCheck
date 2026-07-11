const axios = require('axios');

const parseGithubUrl = (url) => {
    const parts = url.split("/");
    const owner = parts[3];
    const repo = parts[4];

    if(!owner || !repo){
        throw new Error("Invalid Github url");
    }
    return{owner, repo};
}

const fetchRepoTree = async (owner, repo) => {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;

    const response = await axios.get(url);
    const tree = response.data.tree;

    const allowedExtensions = [".js",".jsx",".ts",".tsx",".json",".env"];
    const ignoreFolders = ["node_modules",".git","dist","build"];

    const files = tree.filter((item)=> {
        if(item.type !== "blob") return false;

        if (ignoreFolders.some((folder) => item.path.includes(folder))) return false;

        if (!allowedExtensions.some((ext) => item.path.endsWith(ext))) return false;

        return true;
    })
    return files;
}

const fetchFileContent = async (owner,repo,filepath) => {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${filepath}`;

    const response = await axios.get(url);
    return response.data;
}

const detectTechStack = (files) => {
    const filepaths = files.map((file) => file.path);
    const stack = [];

    if(filepaths.some((p) => p.endsWith(".jsx") || p.endsWith(".tsx"))){
        stack.push("React");
    }
    if(filepaths.some((p) => p.endsWith(".ts") || p.endsWith(".tsx"))){
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
    return stack;
}

module.exports = {
    parseGithubUrl,
    fetchRepoTree,
    fetchFileContent,
    detectTechStack
};