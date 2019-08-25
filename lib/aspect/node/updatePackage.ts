/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

        // Run the correct dependency install command
        if (await p.hasFile("yarn.lock")) {
            const log = new StringCapturingProgressLog();
            log.stripAnsi = true;
            await spawnLog(
                "yarn",
                ["install"],
                {
                    cwd: (p as LocalProject).baseDir,
                    log,
                    logCommand: true,
                });
        } else {
            const log = new StringCapturingProgressLog();
            log.stripAnsi = true;
            await spawnLog(
                "npm",
                ["install"],
                {
                    cwd: (p as LocalProject).baseDir,
                    log,
                    logCommand: true,
                });
        }

        // We need to delete node_modules as not everybody has that in their .gitignore
        await p.deleteDirectory("node_modules");
        return p;
    }

    return p;
}
