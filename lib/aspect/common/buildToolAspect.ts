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

export const BuildToolName = "buildTool";

export const BuildToolAspect: Aspect = projectClassificationAspect({
        name: BuildToolName,
        // Deliberately don't display
        displayName: undefined,
        toDisplayableFingerprintName: () => "Build tool",
    },
    { tags: "maven", reason: "has Maven POM", test: async p => p.hasFile("pom.xml") },
    { tags: "gradle", reason: "has build.gradle", test: async p => p.hasFile("build.gradle") },
);
