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

import { gatherFromFiles } from "@atomist/automation-client/lib/project/util/projectUtils";
import { projectClassificationAspect } from "@atomist/sdm-pack-aspect";
import {
    Aspect,
    FP,
    NpmDeps,
} from "@atomist/sdm-pack-fingerprint";
import { NpmDepData } from "@atomist/sdm-pack-fingerprint/lib/fingerprints/npmDeps";

export const FrameworkName = "framework";

/**
 * Identify common frameworks
 * @type {Aspect<ClassificationData>}
 */
export const FrameworkAspect: Aspect = projectClassificationAspect(
    {
        name: FrameworkName,
        // Deliberately don't display
        displayName: undefined,
        toDisplayableFingerprintName: () => "Framework",
    },
    {
        tags: "node",
        reason: "has package.json",
        test: async p => (await p.getFiles("**/package.json")).length > 0,
    },
    {
        tags: "spring-boot",
        reason: "POM file references Spring Boot",
        test: async p => {
            const pomContents = await gatherFromFiles(p, "**/pom.xml", async f => f.getContent());
            for (const pomContent of pomContents) {
                if (pomContent.includes("org.springframework.boot")) {
                    return true;
                }
            }
            return false;
        },
    },
    {
        tags: "react",
        reason: "package.json references react",
        testFingerprints: async fps => hasNpmDep(fps, fp => fp.name === "react"),
    },
    {
        tags: "angular",
        reason: "package.json references angular",
        testFingerprints: async fps => hasNpmDep(fps, fp => fp.data[0].startsWith("@angular/")),
    },
    {
        tags: "rails",
        reason: "Gemfile references Rails",
        test: async p => {
            const gemMatch = /gem[\s+]['"]rails['"]/;
            const gemfileContents = await gatherFromFiles(p, "**/Gemfile", async f => f.getContent());
            for (const content of gemfileContents) {
                if (gemMatch.test(content)) {
                    return true;
                }
            }
            return false;
        },
    },
    {
        tags: "django",
        reason: "requirements.txt references Django",
        test: async p => {
            const djangoMatch = /^Django==/;
            const reqTexts = await gatherFromFiles(p, "**/requirements.txt", async f => f.getContent());
            for (const content of reqTexts) {
                if (djangoMatch.test(content)) {
                    return true;
                }
            }
            return false;
        },
    },
);

function hasNpmDep(fps: FP[], test: (fp: FP<NpmDepData>) => boolean): boolean {
    return fps && fps.some(fp => fp.type === NpmDeps.name && test(fp));
}
