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
import {
    ClassificationAspect,
    projectClassificationAspect,
} from "@atomist/sdm-pack-aspect";
import { Aspect } from "@atomist/sdm-pack-fingerprint";

export const CiAspect: ClassificationAspect = projectClassificationAspect(
    {
        name: "ci",
        displayName: "CI",
        toDisplayableFingerprintName: () => "CI tool",
    },
    {
        tags: "travis",
        reason: "has .travis.yml",
        test: async p => p.hasFile(".travis.yml"),
    },
    {
        tags: "jenkins",
        reason: "has JenkinsFile",
        test: async p => p.hasFile("Jenkinsfile"),
    },
    {
        tags: "circle",
        reason: "has .circleci/config.yml",
        test: async p => p.hasFile(".circleci/config.yml"),
    },
    {
        tags: "concourse",
        reason: "has pipeline.yml",
        test: async p => p.hasFile("pipeline.yml"),
    },
    {
        tags: "github-actions",
        reason: "has .github/workflows YAML",
        test: async p => projectUtils.fileExists(p, [".github/workflows/*.y{,a}ml"]),
    },
    {
        tags: "azure-devops",
        reason: "",
        test: async p => projectUtils.fileExists(p, ""),
    },
);
