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

import { projectUtils } from "@atomist/automation-client";
import { projectClassificationAspect } from "@atomist/sdm-pack-aspect";
import { Aspect } from "@atomist/sdm-pack-fingerprint";

export const LanguageName = "language";

/**
 * Identify common frameworks
 * @type {Aspect<ClassificationData>}
 */
export const LanguageAspect: Aspect = projectClassificationAspect(
    {
        name: LanguageName,
        // Deliberately don't display
        displayName: undefined,
        toDisplayableFingerprintName: () => "Technology stack",
    },
    { tags: "python", reason: "has requirements.txt", test: async p => p.hasFile("requirements.txt") },
    {
        tags: "python",
        reason: "has Python files in root",
        test: async p => await projectUtils.countFiles(p, "*.py", async () => true) > 0,
    },
);
