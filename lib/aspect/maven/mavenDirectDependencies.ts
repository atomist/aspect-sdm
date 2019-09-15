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
    astUtils,
    MatchResult,
} from "@atomist/automation-client";
import { microgrammar } from "@atomist/microgrammar";
import { ApplyFingerprint, Aspect, DefaultTargetDiffHandler, FP, sha256 } from "@atomist/sdm-pack-fingerprint";
import { VersionedArtifact } from "@atomist/sdm-pack-spring";
import { findDeclaredDependencies } from "@atomist/sdm-pack-spring/lib/maven/parse/fromPom";
import { XmldocFileParser } from "@atomist/sdm-pack-spring/lib/xml/XmldocFileParser";
import {
    bold,
    codeLine,
} from "@atomist/slack-messages";

const MavenDirectDep = "maven-direct-dep";

const applyDependencyFingerprint: ApplyFingerprint<VersionedArtifact> = async (p, papi) => {
    const fp = papi.parameters.fp;
    const artifact = dataToVersionedArtifact(fp);

    await astUtils.doWithAllMatches(p,
        new XmldocFileParser(),
        "**/pom.xml",
        // TODO could zero in here with path literals
        `//project/dependencies/dependency[/artifactId][/groupId]`,
        dep => {
            const groupId = dep.$children.find(c => c.$value.startsWith("<groupId>"));
            const artifactId = dep.$children.find(c => c.$value.startsWith("<artifactId>"));
            if (groupId.$value.includes(">" + artifact.group + "<") && artifactId.$value.includes(">" + artifact.artifact + "<")) {
                updateDependencyStanza(dep, artifact);
            }
        });

    return p;
};

const LegalValue = /[\[\]\(\),a-zA-Z_\.0-9\-]+/;

// Match the version element and preceding whitespace
const versionGrammar = microgrammar<{version: string}>({
    pre: /\s+/,
    lx2: "<version>",
    version: LegalValue,
    rx2: "</version>",
    // Ensure that we pick up the whitespace before the <version>
    $consumeWhiteSpaceBetweenTokens: false,
});

function updateDependencyStanza(dep: MatchResult, to: VersionedArtifact): void {
    const versionMatch = versionGrammar.firstMatch(dep.$value);

    if (to.version === "managed") {
        // Delete existing version
        if (!!versionMatch) {
            dep.$value = dep.$value.replace(versionMatch.$matched, "");
        }
    } else if (!!to.version) {
        const newVersionValue = `<version>${to.version}</version>`;
        if (versionMatch) {
            // Replace an existing version
            dep.$value = dep.$value.replace(versionMatch.$matched, newVersionValue);
        } else {
            dep.$value = dep.$value.replace("</artifactId>",
                "</artifactId>\n" + indentationOf(dep.$value, "<artifactId>") + newVersionValue);
        }
    }
}

/**
 * Emits direct dependencies only
 */
export const MavenDirectDependencies: Aspect<VersionedArtifact> = {
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
    apply: applyDependencyFingerprint,
    toDisplayableFingerprintName: name => name,
    toDisplayableFingerprint: fp => dataToVersionedArtifact(fp).version,
    workflows: [
        DefaultTargetDiffHandler,
    ],
};

function gavToFingerprint(gav: VersionedArtifact): FP<VersionedArtifact> {
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

function indentationOf(content: string, what: string): string {
    const lines = content.split("\n");
    const line = lines.find(l => l.includes(what));
    if (line) {
        return line.substr(0, line.indexOf(what));
    }
    return "";
}
