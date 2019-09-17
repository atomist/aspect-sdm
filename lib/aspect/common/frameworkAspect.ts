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
        test: async p => p.hasFile("package.json"),
    },
    {
        tags: "spring-boot",
        reason: "POM file references Spring Boot",
        test: async p => {
            const pom = await p.getFile("pom.xml");
            if (!pom) {
                return false;
            }
            return (await pom.getContent()).includes("org.springframework.boot");
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
            const gemfile = await p.getFile("Gemfile");
            if (!gemfile) {
                return false;
            }
            const gemMatch = /gem[\s+]['"]rails['"]/;
            const content = await gemfile.getContent();
            return gemMatch.test(content);
        },
    },
    {
        tags: "django",
        reason: "requirements.txt references Django",
        test: async p => {
            const reqText = await p.getFile("requirements.txt");
            if (!reqText) {
                return false;
            }
            const djangoMatch = /^Django==/;
            const content = await reqText.getContent();
            return djangoMatch.test(content);
        },
    },
);

function hasNpmDep(fps: FP[], test: (fp: FP<NpmDepData>) => boolean): boolean {
    return fps && fps.some(fp => fp.type === NpmDeps.name && test(fp));
}
