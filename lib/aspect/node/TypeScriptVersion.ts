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
    logger,
} from "@atomist/automation-client";
import {
    Aspect,
    DefaultTargetDiffHandler,
    sha256,
} from "@atomist/sdm-pack-fingerprint";
import { PackageJson } from "@atomist/sdm-pack-node";
import {
    bold,
    codeLine,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import { updatePackage } from "./updatePackage";

export const TypeScriptVersionType = "typescript-version";
const PackageJsonName = "package.json";

/**
 * What version of TypeScript does each project build with?
 *
 * Each TypeScript project gets one fingerprint, containing
 * the TypeScript version(s) declared as a dependency and/or devDependency.
 * in package.json.
 *
 */
export const TypeScriptVersion: Aspect = {
        name: TypeScriptVersionType,
        displayName: "TypeScript version",
        documentationUrl:
            "https://atomist-blogs.github.io/org-visualizer/modules/_lib_feature_node_typescriptversionfeature_.html#typescriptversionfeature",
        summary: (diff, target) => {
            return {
                title: "New TypeScript Version Update",
                description:
                    `Target version for TypeScript is ${codeLine(target.data[0])}.
Project ${bold(`${diff.owner}/${diff.repo}/${diff.branch}`)} is currently using version ${codeLine(diff.to.data[0])}.`,
            };
        },
        extract: async p => {
            if (!(await p.hasFile(PackageJsonName))) {
                return undefined;
            }

            try {
                const pj = JSON.parse(await (await p.getFile(PackageJsonName)).getContent()) as PackageJson;

                const versions = [
                    _.get(pj.dependencies, "typescript"),
                    _.get(pj.devDependencies, "typescript"),
                ].filter(v => !!v);

                if (versions.length === 0) {
                    return undefined;
                }

                return {
                    type: TypeScriptVersionType,
                    name: TypeScriptVersionType,
                    abbreviation: "tsv",
                    version: "0.1.0", // of this fingerprint code
                    data: versions,
                    sha: sha256(JSON.stringify(versions)),
                };
            } catch (e) {
                logger.warn("Error extracting TypeScript version: %s", e.message);
                return undefined;
            }
        },
        apply: async (p, papi) => {
            const fp = papi.parameters.fp;
            const pckage = "typescript";
            const version = fp.data[0];
            return updatePackage(pckage, version, p as GitProject);
        },
        toDisplayableFingerprintName: () => "TypeScript version",
        toDisplayableFingerprint: fp => fp.data.join(","),
        workflows: [
            DefaultTargetDiffHandler,
        ],
    }
;
