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
import { Microgrammar } from "@atomist/microgrammar";
import {
    Aspect,
    DefaultTargetDiffHandler,
    FP,
    sha256,
} from "@atomist/sdm-pack-fingerprints";
import { VersionedArtifact } from "@atomist/sdm-pack-spring";
import { findDeclaredDependencies } from "@atomist/sdm-pack-spring/lib/maven/parse/fromPom";
import {
    bold,
    codeLine,
} from "@atomist/slack-messages";

const MavenDirectDep = "maven-direct-dep";

export const LEGAL_VALUE = /[\[\]\(\),a-zA-Z_\.0-9\-]+/;

const VERSION = {
    lx2: "<version>",
    version: LEGAL_VALUE,
    rx2: "</version>",
};

export const DEPENDENCY_GRAMMAR = Microgrammar.fromDefinitions({
    _lx1: "<dependency>",
    lx1: "<groupId>",
    group: LEGAL_VALUE,
    rx1: "</groupId>",
    lx: "<artifactId>",
    artifact: LEGAL_VALUE,
    rx: "</artifactId>",
    ...VERSION,
});

export const DEPENDENCY_WITHOUT_VERSION_GRAMMAR = Microgrammar.fromDefinitions({
    _lx1: "<dependency>",
    lx1: "<groupId>",
    group: LEGAL_VALUE,
    rx1: "</groupId>",
    lx: "<artifactId>",
    artifact: LEGAL_VALUE,
    rx: "</artifactId>",
});

/**
 * Emits direct dependencies only
 */
export const MavenDirectDependencies: Aspect = {
    name: MavenDirectDep,
    displayName: "Maven declared dependencies",
    summary: (diff, target) => {
        return {
            title: "New Maven Dependency Version Update",
            description:
                `Target version for Maven dependency ${bold(`${dataToVersionedArtifact(diff.from).group}:${dataToVersionedArtifact(diff.from).artifact}`)} is ${codeLine(dataToVersionedArtifact(target).version)}.
Project ${bold(`${diff.owner}/${diff.repo}/${diff.branch}`)} is currently using version ${codeLine(dataToVersionedArtifact(diff.to).version)}.`,
        };
    },
    extract: async p => {
        const deps = await findDeclaredDependencies(p, "**/pom.xml");
        return deps.dependencies.map(gavToFingerprint);
    },
    apply: async (p, papi) => {
        await projectUtils.doWithFiles(p, "**/pom.xml", async f => {
            const pom = await f.getContent();

            const matches = DEPENDENCY_GRAMMAR.findMatches(pom) as any as VersionedArtifact[];
            matches.push(...DEPENDENCY_WITHOUT_VERSION_GRAMMAR.findMatches(pom) as any as VersionedArtifact[]);
            if (matches.length === 0) {
                return;
            }

            const fp = papi.parameters.fp;
            const artifact = dataToVersionedArtifact(fp);
            const artifactToUpdate = matches.find(m => m.group === artifact.group && m.artifact === artifact.artifact);
            if (!!artifactToUpdate) {
                const updater = Microgrammar.updatableMatch(artifactToUpdate as any, pom);
                if (artifact.version === "managed") {
                    // Delete existing version
                    if (!!artifactToUpdate.version) {
                        const indent = indentationFromMatch((artifactToUpdate as any).$matched);
                        updater.replaceAll(`<dependency>${indent}<groupId>${artifact.group}</groupId>${indent}<artifactId>${artifact.artifact}</artifactId>`);
                    }
                } else if (!!artifactToUpdate.version) {
                    updater.version = artifact.version;
                } else {
                    // Add version in
                    const indent = indentationFromMatch((artifactToUpdate as any).$matched);
                    updater.replaceAll(`<dependency>${indent}<groupId>${artifact.group}</groupId>${indent}<artifactId>${artifact.artifact}</artifactId>${indent}<version>${artifact.version}</version>`);
                }
                await f.setContent(updater.newContent());
            }
        });
        return p;
    },
    toDisplayableFingerprintName: name => name,
    toDisplayableFingerprint: fp => dataToVersionedArtifact(fp).version,
    workflows: [
        DefaultTargetDiffHandler,
    ],
};

function gavToFingerprint(gav: VersionedArtifact): FP {
    const data = {
        ...gav,
        version: !gav.version ? "managed" : gav.version,
    };
    return {
        type: MavenDirectDep,
        name: `${gav.group}:${gav.artifact}`,
        abbreviation: "mvn",
        version: "0.1.0",
        data,
        sha: sha256(JSON.stringify(data)),
    };
}

function dataToVersionedArtifact(fp: Pick<FP, "data">): VersionedArtifact {
    if (typeof fp.data === "string") {
        return JSON.parse(fp.data) as VersionedArtifact;
    }
    return fp.data as VersionedArtifact;
}

function indentationFromMatch(match: string): string {
    const regexp = />([\s]*)</m;
    return regexp.exec(match)[1];
}
