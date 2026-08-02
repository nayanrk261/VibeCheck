import fetch from 'node-fetch';

export async function scanDependencies(packageJsonContent) {
  try {
    const pkg = typeof packageJsonContent === 'string' 
      ? JSON.parse(packageJsonContent) 
      : packageJsonContent;

    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    const vulnerabilities = [];

    const queries = Object.entries(dependencies).map(([name, version]) => ({
      package: { name, ecosystem: 'npm' },
      version: version.replace(/[\^~>=<]/g, '')
    }));

    if (queries.length === 0) return vulnerabilities;

    const response = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries })
    });

    if (!response.ok) return vulnerabilities;

    const data = await response.json();

    data.results?.forEach((result, index) => {
      if (result.vulns && result.vulns.length > 0) {
        const pkgName = queries[index].package.name;
        const vuln = result.vulns[0];
        vulnerabilities.push({
          severity: 'HIGH',
          title: `Vulnerable Dependency: ${pkgName}`,
          description: vuln.details || `Package ${pkgName} contains known CVE vulnerabilities: ${vuln.id}`,
          fix: `Upgrade ${pkgName} to the latest secure version using 'npm install ${pkgName}@latest'`
        });
      }
    });

    return vulnerabilities;
  } catch (error) {
    console.error('Dependency scan failed:', error.message);
    return [];
  }
}