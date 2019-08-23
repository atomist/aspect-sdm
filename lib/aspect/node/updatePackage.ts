import {
    GitProject,
    LocalProject,
} from "@atomist/automation-client";
import {
    spawnLog,
    StringCapturingProgressLog,
    TransformReturnable,
} from "@atomist/sdm";

export async function updatePackage(pckage: string, version: string, p: GitProject): Promise<TransformReturnable> {
    const file = await p.getFile("package.json");

    if (!!file) {
        const pj = await file.getContent();
        const regexp = new RegExp(`"${pckage}":\\s*".*"`, "g");

        // Replace the dependency across the whole package.json
        await file.setContent(pj.replace(regexp, `"${pckage}": "${version}"`));

        // Check if that actually made an update
        if ((await p.gitStatus()).isClean) {
            return p;
        }

        // Only run 'npm install' if there were changes to the package.json
        const log = new StringCapturingProgressLog();
        log.stripAnsi = true;
        const result = await spawnLog(
            "npm",
            ["install"],
            {
                cwd: (p as LocalProject).baseDir,
                log,
                logCommand: true,
            });

        // We need to delete node_modules as not everybody has that in their .gitignore
        await p.deleteDirectory("node_modules");

        if (result.code !== 0) {
            return {
                edited: false,
                success: false,
                error: new Error(`'npm install' failed:\n\n${log.log}`),
                target: p,
            };
        }
    }

    return p;
}
