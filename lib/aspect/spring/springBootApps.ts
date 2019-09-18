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
    sha256,
} from "@atomist/sdm-pack-fingerprint";
import { SpringBootProjectStructure } from "@atomist/sdm-pack-spring";

export interface SpringBootAppData {
    applicationClassName: string;
    applicationClassPackage: string;
}

export const SpringBootAppClassAspectName = "spring-boot-app-class";

export const SpringBootAppClass: Aspect<SpringBootAppData> = {
    name: SpringBootAppClassAspectName,
    displayName: "Spring Boot application class",
    extract: async p => {
        const structures = await SpringBootProjectStructure.inferFromJavaOrKotlin(p);
        if (structures.length > 0) {
            return structures.map(structure => {
                const data = {
                    applicationClassName: structure.applicationClass,
                    applicationClassPackage: structure.applicationPackage,
                };
                return {
                    name: SpringBootAppClassAspectName,
                    version: "1.0.0",
                    type: SpringBootAppClassAspectName,
                    data,
                    displayValue: `${structure.applicationPackage}.${structure.applicationClass}`,
                    displayName: "Spring Boot application class",
                    sha: sha256(data),
                };
            });
        } else {
            return undefined;
        }
    },
};
