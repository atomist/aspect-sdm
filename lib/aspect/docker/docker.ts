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
    astUtils, MicrogrammarBasedFileParser,
    Project,
    ProjectFile,
    projectUtils,
} from "@atomist/automation-client";
import { firstOf, microgrammar, optional } from "@atomist/microgrammar";
import { DockerFileParser } from "@atomist/sdm-pack-docker";
import {
    ApplyFingerprint,
    Aspect,
    DefaultTargetDiffHandler,
    DiffSummaryFingerprint,
    ExtractFingerprint,
    FP,
    sha256,
} from "@atomist/sdm-pack-fingerprint";
import {
    bold,
    codeLine,
} from "@atomist/slack-messages";

import * as _ from "lodash";

export const DockerPathType = "docker-path";
export const DockerPortsType = "docker-ports";

export interface DockerBaseData {

    /**
     * Docker image name. This is also the name of the fingerprint
     */
    image: string;

    version: string;

    /**
     * Path to the Docker file
     */
    path: string;
}

/**
 * Construct a Docker base image fingerprint from the given image and version
 * @param {string} image
 * @param {string} version
 * @param path path of the docker file
 * @return {FP}
 */
export function createDockerBaseFingerprint(image: string, version: string, path: string): FP<DockerBaseData> {
    const data = { image, version, path };
    return {
        type: DockerFrom.name,
        name: image,
        abbreviation: "dbi",
        version: "0.0.1",
        data,
        sha: sha256(JSON.stringify({ image, version })),
    };
}

const DockerFromGrammar = microgrammar<{ image: string, version?: { version: string } }>({
    // Ensure this is not a comment line
    _from: firstOf(/^[^#]*FROM/, /^[^#]*from/),
    image: /[A-Za-z0-9\.\/\-]+/,
    version: optional({
        _colon: ":",
        version: /[^\s]+/,
    }),
});

export async function parseDockerfile(p: Project, f: ProjectFile): Promise<FP<DockerBaseData>> {
    const match = DockerFromGrammar.firstMatch(await f.getContent());
    return match ?
        createDockerBaseFingerprint(match.image, _.get(match, "version.version", "latest"), f.path)
        : undefined;
}

export const dockerBaseFingerprint: ExtractFingerprint<DockerBaseData> = async p => {
    const fps: FP[] = [];
    for await (const f of projectUtils.fileIterator(p, "**/Dockerfile", async () => true)) {
        if (f && await f.getContent() !== "") {
            fps.push(await parseDockerfile(p, f));
        }
    }
    return fps;
};

export const applyDockerBaseFingerprint: ApplyFingerprint<DockerBaseData> = async (p, papi) => {
    const fp = papi.parameters.fp;
    await astUtils.doWithAllMatches(
        p,
        new MicrogrammarBasedFileParser("dockerFile", "from", DockerFromGrammar),
        "**/Dockerfile",
        "//version",
        n => n.$value = fp.data.version,
    );
    return p;
};

export const diffDockerBaseFingerprints: DiffSummaryFingerprint<DockerBaseData> = (diff, target) => {
    return {
        title: "New Docker Base Image Tag Update",
        description:
            `Target tag for Docker base image ${bold(diff.from.data.image)} is ${codeLine(target.data.version)}.
Project ${bold(`${diff.owner}/${diff.repo}/${diff.branch}`)} is currently using tag ${codeLine(diff.to.data.version)}.`,
    };
};

export const DockerFrom: Aspect<DockerBaseData> = {
    displayName: "Docker base images",
    name: "docker-base-image",
    apply: applyDockerBaseFingerprint,
    extract: dockerBaseFingerprint,
    summary: diffDockerBaseFingerprints,
    toDisplayableFingerprintName: name => name,
    toDisplayableFingerprint: fp => fp.data.version,
    workflows: [
        DefaultTargetDiffHandler,
    ],
};

function createDockerPortsFingerprint(data: string[]): FP {
    return {
        type: DockerPortsType,
        name: DockerPortsType,
        abbreviation: `dps`,
        version: "0.0.1",
        data,
        sha: sha256(JSON.stringify(data)),
    };
}

export const extractDockerPortsFingerprint: ExtractFingerprint = async p => {
    const ports = await astUtils.findValues(p, DockerFileParser,
        "**/Dockerfile",
        "//EXPOSE/port");
    return ports.length > 0 ? createDockerPortsFingerprint(ports) : undefined;
};

export const DockerPorts: Aspect = {
    displayName: "Docker ports",
    name: DockerPortsType,
    extract: extractDockerPortsFingerprint,
    toDisplayableFingerprint: fp => fp.data.join(","),
};

export const extractDockerPathFingerprint: ExtractFingerprint = async p => {
    const paths = await projectUtils.gatherFromFiles(p,
        "**/Dockerfile", async f => f.path);
    return paths.length === 1 ? {
        type: DockerPathType,
        name: DockerPathType,
        abbreviation: "dpa",
        version: "0.0.1",
        data: paths[0],
        sha: sha256(JSON.stringify(paths[0])),
    } : undefined;
};

export const DockerfilePath: Aspect = {
    displayName: "Dockerfile path",
    name: DockerPathType,
    extract: extractDockerPathFingerprint,
    toDisplayableFingerprint: fp => fp.data,
};
