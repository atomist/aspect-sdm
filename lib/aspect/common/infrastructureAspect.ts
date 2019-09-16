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

export const InfrastructureAspect: Aspect = projectClassificationAspect({
        name: "infrastructure",
        // Deliberately don't display
        displayName: undefined,
        toDisplayableFingerprintName: () => "Infrastructure",
    },
    { tags: "terraform", reason: "has *.tf file", test: async p => projectUtils.fileExists(p, ["**/*.tf"]) },
    // add cloud formation
    { tags: "docker", reason: "has Dockerfile", test: async p => projectUtils.fileExists(p, ["**/Dockerfile"]) },
    { tags: "docker-compose", reason: "has docker-compose.yaml", test: async p => projectUtils.fileExists(p, ["**/docker-compose.y{,a}ml"]) },
    // kubernetes deployment or service spec
    { tags: "cloudfoundry", reason: "has manifest.yaml", test: async p => projectUtils.fileExists(p, ["**/manifest.y{,a}ml"]) },
    {
        tags: "google-app-engine",
        reason: "has app.yaml",
        test: async p => {
            return (await projectUtils.fileExists(p, ["**/app.y{,a}ml"]))
                || (projectUtils.fileExists(p, ["**/app.json"]));
        },
    },
);
