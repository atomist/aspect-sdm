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
import { Aspect } from "@atomist/sdm-pack-fingerprint";

export const FrameworkName = "framework";

/**
 * Identify common frameworks
 * @type {Aspect<ClassificationData>}
 */
export const FrameworkAspect: Aspect = projectClassificationAspect(
    {
        alwaysFingerprint: true,
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
);
