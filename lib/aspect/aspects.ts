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

import { SoftwareDeliveryMachine } from "@atomist/sdm";
import {
    AspectReportDetails,
    AspectWithReportDetails,
} from "@atomist/sdm-pack-aspect/lib/aspect/AspectReportDetailsRegistry";
import { LeinDeps } from "@atomist/sdm-pack-clojure/lib/fingerprints/clojure";
import {
    DockerfilePath,
    DockerPorts,
} from "@atomist/sdm-pack-docker";
import { Aspect } from "@atomist/sdm-pack-fingerprints";
import { DockerFrom } from "./docker/docker";
import { branchCount } from "./git/branchCount";
import { K8sSpecs } from "./k8s/specAspect";
import { MavenDirectDependencies } from "./maven/mavenDirectDependencies";
import { MavenParentPom } from "./maven/parentPom";
import { NpmDependencies } from "./node/npmDependencies";
import { TypeScriptVersion } from "./node/TypeScriptVersion";
import { SpringBootStarter } from "./spring/springBootStarter";
import { SpringBootVersion } from "./spring/springBootVersion";
import { TravisScriptsAspect } from "./travis/travisAspect";

export function createAspects(sdm: SoftwareDeliveryMachine): Aspect[] {
    const isStaging = sdm.configuration.endpoints.api.includes("staging");
    const optionalAspects = isStaging ? [] : [];

    const aspects = [
        SpringBootStarter,
        enrich(TypeScriptVersion, {
            shortName: "version",
            category: "Node.js",
            unit: "version",
            url: "fingerprint/typescript-version/typescript-version?byOrg=true",
            description: "TypeScript versions in use across all repositories in your workspace, " +
                "broken out by version and repositories that use each version.",
        }),
        enrich(NpmDependencies, {
            shortName: "dependency",
            category: "Node.js",
            unit: "version",
            url: "drift?type=npm-project-deps&band=true&repos=true",
            description: "Node direct dependencies in use across all repositories in your workspace, " +
                "grouped by Drift Level.",
        }),
        TravisScriptsAspect,
        SpringBootVersion,
        enrich(MavenDirectDependencies, {
            shortName: "dependency",
            category: "Java",
            unit: "version",
            url: "drift?type=maven-direct-dep&band=true&repos=true",
            description: "Maven declared dependencies in use across all repositories in your workspace, " +
                "grouped by Drift Level.",
        }),
        enrich(MavenParentPom, {
            shortName: "parent",
            category: "Java",
            unit: "version",
            url: `drift?type=${MavenParentPom.name}&band=true&repos=true`,
            description: "Maven parent POM in use across all repositories in your workspace, " +
                "grouped by Drift Level.",
        }),
        enrich(LeinDeps, {
            shortName: "dependency",
            category: "Java",
            unit: "version",
            url: "drift?type=clojure-project-deps&band=true&repos=true",
            description: "Leiningen direct dependencies in use across all repositories in your workspace, " +
                "grouped by Drift Level.",
        }),
        enrich(DockerFrom, {
            shortName: "images",
            category: "Docker",
            unit: "tag",
            url: "fingerprint/docker-base-image/*?byOrg=true&presence=false&progress=false&otherLabel=false&trim=false",
            description: "Docker base images in use across all repositories in your workspace, " +
                "broken out by image label and repositories where used.",
        }),
        DockerfilePath,
        enrich(DockerPorts, {
            shortName: "ports",
            category: "Docker",
            unit: "port",
            url: "fingerprint/docker-ports/*?byOrg=true&presence=false&progress=false&otherLabel=false&trim=false",
            description: "Ports exposed in Docker configuration in use  across all repositories in your workspace, " +
                "broken out by port number and repositories where used.",
            manage: false,
        }),
        K8sSpecs,
        enrich(branchCount, {
            shortName: "branches",
            category: "Git",
            unit: "branch",
            url: `fingerprint/${branchCount.name}/${branchCount.name}?byOrg=true&presence=false&progress=false&otherLabel=false&trim=false`,
            description: "Number of Git branches across repositories in your workspace, " +
                "grouped by Drift Level.",
            manage: false,
        }),
        ...optionalAspects,
    ];

    return aspects;
}

function enrich(aspect: Aspect, details: AspectReportDetails): AspectWithReportDetails {
    return {
        ...aspect,
        details,
    };
}
