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

import { globAspect, GlobAspectData, isGlobMatchFingerprint } from "@atomist/sdm-pack-aspect";
import { FP } from "@atomist/sdm-pack-fingerprint";
import { extractVersionedArtifact } from "@atomist/sdm-pack-spring/lib/maven/parse/fromPom";
import { XmldocFileParser, XmldocTreeNode } from "@atomist/sdm-pack-spring/lib/xml/XmldocFileParser";
import { evaluateExpression, isSuccessResult } from "@atomist/tree-path";

const SpringBootVersionType = "spring-boot-version";

const parser = new XmldocFileParser();

export interface BootVersion {

    version: string;
}

export const SpringBootVersion = globAspect<BootVersion>({
    name: SpringBootVersionType,
    displayName: "Spring Boot Version",
    glob: "**/pom.xml",
    extract: async f => {
        // TODO this doesn't get the non-parsing optimization we can get with files.
        // Need a variant of globAspect that can run path expressions across the whole project
        const ast = await parser.toAst(f);
        const result = evaluateExpression(ast, "//parent[/artifactId[@innerValue='spring-boot-starter-parent']]");
        if (isSuccessResult(result)) {
            const va = extractVersionedArtifact(result[0] as any as XmldocTreeNode);
            if (va) {
                return { version: va.version };
            }
        }
        return undefined;
    },
    toDisplayableFingerprintName: () => "Spring Boot version",
    toDisplayableFingerprint: fp => fp.data.matches.map(v => v.version).join(","),
});

export function isSpringBootVersionFingerprint(fp: FP): fp is FP<GlobAspectData<BootVersion>> {
    return fp.type === SpringBootVersionType && isGlobMatchFingerprint(fp);
}
