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
    Aspect,
    DefaultTargetDiffHandler,
    fingerprintOf,
    FP,
} from "@atomist/sdm-pack-fingerprint";
import {
    applyParentPom,
    gatherParentPoms,
} from "../maven/parentPom";

const SpringBootVersionType = "spring-boot-version";

export interface BootVersion {
    version: string;
}

export const SpringBootVersion: Aspect<BootVersion> = {
    name: SpringBootVersionType,
    displayName: "Spring Boot version",
    extract: async p => {
        const gavs = await gatherParentPoms(p);
        if (!!gavs && gavs.length > 0) {
            return gavs.filter(gav =>
                gav.artifact === "spring-boot-starter-parent"
                && gav.group === "org.springframework.boot").map(gav => (fingerprintOf({
                    data: gav,
                    type: SpringBootVersionType,
                    name: SpringBootVersionType,
                    abbreviation: "sbv",
                })));
        }
        return undefined;
    },
    apply: (p, papi) => {
        return applyParentPom({
            artifact: "spring-boot-starter-parent",
            group: "org.springframework.boot",
            version: papi.parameters.fp.data.version,
        }, p);
    },
    toDisplayableFingerprintName: () => "Spring Boot version",
    toDisplayableFingerprint: fp => fp.data.version,
    workflows: [
        DefaultTargetDiffHandler,
    ],
};

export function isSpringBootVersionFingerprint(fp: FP): fp is FP<BootVersion> {
    return fp.type === SpringBootVersionType;
}
