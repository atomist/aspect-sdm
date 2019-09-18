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
    Project,
    projectUtils,
    RegexFileParser,
} from "@atomist/automation-client";
import { matchIterator } from "@atomist/automation-client/lib/tree/ast/astUtils";
import { projectClassificationAspect } from "@atomist/sdm-pack-aspect";
import { Aspect } from "@atomist/sdm-pack-fingerprint";
import * as yaml from "js-yaml";

const likelyPlacesForDeployCommands = ["**/*.sh", "*.md", "bin/*", "script/*"];

export const InfrastructureAspect: Aspect = projectClassificationAspect({
    name: "infrastructure",
    // Deliberately don't display
    displayName: undefined,
    toDisplayableFingerprintName: () => "Infrastructure",
},
    { tags: "terraform", reason: "has *.tf file", test: async p => projectUtils.fileExists(p, ["**/*.tf"]) },
    { tags: "docker", reason: "has Dockerfile", test: async p => projectUtils.fileExists(p, ["**/Dockerfile"]) },
    { tags: "docker-compose", reason: "has docker-compose.yaml", test: async p => projectUtils.fileExists(p, ["**/docker-compose.y{,a}ml"]) },
    { tags: "cloudfoundry", reason: "has manifest.yaml", test: async p => projectUtils.fileExists(p, ["**/manifest.y{,a}ml"]) },
    {
        tags: "google-app-engine",
        reason: "has app.yaml",
        test: p => projectUtils.fileExists(p, ["**/app.y{,a}ml", "**/app.json"]),
    },
    {
        tags: "openshift",
        reason: ".openshift directory detected",
        test: p => projectUtils.fileExists(p, ["**/.openshift/*"]),
    },
    {
        tags: "heroku",
        reason: "a script pushes to heroku",
        test: p => containsRegex(p, likelyPlacesForDeployCommands, /git push (--force)? heroku/),
    },
    {
        tags: "ansible",
        reason: "a script references ansible-playbook",
        test: p => containsRegex(p, likelyPlacesForDeployCommands, /ansible-playbook/),
    },
    {
        tags: "k8s",
        reason: "has k8s files",
        test: async p => {
            const matches = await projectUtils.gatherFromFiles(p, ["**/*.yaml", "**/*.json"], async f => {
                const content = await f.getContent();
                try {
                    const yamls = yaml.safeLoadAll(content);
                    for (const y of yamls) {
                        if (!!y && !!y.apiVersion && !!y.kind) {
                            return true;
                        }
                    }
                } catch (e) {
                    // Ignoring failing yaml loading
                }
                return false;
            });
            return matches.some(m => !!m);
        },
    },
    {
        tags: "cloudformation",
        reason: "has cloud formation files",
        test: async p => {
            const matches = await projectUtils.gatherFromFiles(p, ["**/*.yaml", "**/*.json"], async f => {
                const content = await f.getContent();
                try {
                    const yamls = yaml.safeLoadAll(content);
                    for (const y of yamls) {
                        if (!!y && !!y.Resources) {
                            return true;
                        }
                    }
                } catch (e) {
                    // Ignoring failing yaml loading
                }
                return false;
            });
            return matches.some(m => !!m);
        },
    },
);

// Rod: is there a more efficient way?
async function containsRegex(project: Project, globPatterns: string[], regex: RegExp): Promise<boolean> {
    const parser = new RegexFileParser({
        rootName: "whatevers",
        matchName: "whatever",
        regex,
        captureGroupNames: ["name"],
    });
    const it = matchIterator<{ name: string }>(project, {
        parseWith: parser,
        globPatterns,
        pathExpression: "//whatevers/whatever",
    });
    for await (const anything of it) {
        return true;
    }
    return false;
}
