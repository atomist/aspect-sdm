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

import { logger } from "@atomist/automation-client";
import { gatherFromFiles } from "@atomist/automation-client/lib/project/util/projectUtils";
import { SoftwareDeliveryMachine } from "@atomist/sdm";
import {
    dirName,
    enrich,
    GitRecency,
    globAspect,
    GlobAspectData,
    GlobVirtualizer,
    virtualProjectAspect,
} from "@atomist/sdm-pack-aspect";
import { LeinDeps } from "@atomist/sdm-pack-clojure/lib/fingerprints/clojure";
import {
    DockerfilePath,
    DockerPorts,
} from "@atomist/sdm-pack-docker";
import { Aspect } from "@atomist/sdm-pack-fingerprint";
import { BuildToolAspect } from "./common/buildToolAspect";
import { CiAspect } from "./common/ciAspect";
import {
    FrameworkAspect,
} from "./common/frameworkAspect";
import { InfrastructureAspect } from "./common/infrastructureAspect";
import { LanguageAspect } from "./common/languageAspect";
import { DockerFrom } from "./docker/docker";
import { branchCount } from "./git/branchCount";
import { gitClassificationAspect } from "./git/gitClassificationAspect";
import { GradleBuildFiles } from "./gradle/gradleBuildFile";
import { BadJavaApis } from "./java/badApis";
import { K8sSpecs } from "./k8s/specAspect";
import { JavaVersion } from "./maven/javaVersion";
import { MavenDirectDependencies } from "./maven/mavenDirectDependencies";
import { MavenBuildPlugins } from "./maven/mavenPlugins";
import { MavenParentPom } from "./maven/parentPom";
import { NpmDependencies } from "./node/npmDependencies";
import { TypeScriptVersion } from "./node/TypeScriptVersion";
import { ConsoleLogging } from "./spring/consoleLogging";
import { DefaultBannerAspect } from "./spring/defaultBannerTxtAspect";
import * as idioms from "./spring/idioms";
import { LogbackAspect } from "./spring/logbackAspect";
import { ReactiveWebUsageAspect } from "./spring/reactiveWebUsageAspect";
import { SpringBootAppClass } from "./spring/springBootApps";
import { SpringBootStarter } from "./spring/springBootStarter";
import { SpringBootVersion } from "./spring/springBootVersion";
import { SpringClassificationAspect } from "./spring/springClassificationAspect";
import { SpringBootTwelveFactors } from "./spring/twelveFactors";
import { XmlBeanDefinitions } from "./spring/xmlBeans";
import { YamlConfigFiles } from "./spring/yamlConfigFiles";
import { TravisScriptsAspect } from "./travis/travisAspect";

export const JspFiles: Aspect<GlobAspectData> =
    globAspect({ name: "jsp-files", displayName: "JSP files", glob: "**/*.jsp" });

export const DefaultPackageJavaFiles: Aspect<GlobAspectData> =
    globAspect({
        name: "default-package-java",
        displayName: "Java files in default package",
        glob: "**/src/main/java/*.java",
    });

export const VirtualProjectAspects = virtualProjectAspect(
    async p => {
        return {
            reason: "has Maven pom",
            // TODO what about multi modules
            paths: await gatherFromFiles(p, "**/pom.xml", async f => dirName(f)),
        };
    },
    async p => {
        return {
            reason: "has gradle file",
            paths: await gatherFromFiles(p, "**/build.gradle.json", async f => dirName(f)),
        };
    },
    async p => {
        return {
            reason: "has package.json",
            paths: await gatherFromFiles(p, "**/package.json", async f => dirName(f)),
        };
    },
);

export function createAspects(sdm: SoftwareDeliveryMachine): Aspect[] {
    const isStaging = sdm.configuration.endpoints.api.includes("staging");
    const optionalAspects = isStaging ? [] : [];

    const aspects = [
        VirtualProjectAspects,

        // This must run before any other consolidate aspects
        GlobVirtualizer,

        JavaVersion,
        SpringBootStarter,
        enrich(TypeScriptVersion, {
            shortName: "version",
            category: "Node.js",
            unit: "version",
            url: "fingerprint/typescript-version/typescript-version?byOrg=true&trim=false",
            description: "TypeScript versions in use across all repositories in your workspace, " +
            "broken out by version and repositories that use each version.",
        }),
        enrich(NpmDependencies, {
            shortName: "dependency",
            category: "Node.js",
            unit: "version",
            url: "drift?type=npm-project-deps&band=true&repos=false",
            description: "Node direct dependencies in use across all repositories in your workspace, " +
            "grouped by Drift Level.",
        }),
        TravisScriptsAspect,
        SpringBootVersion,
        enrich(MavenDirectDependencies, {
            shortName: "dependency",
            category: "Java",
            unit: "version",
            url: "drift?type=maven-direct-dep&band=true&repos=false",
            description: "Maven declared dependencies in use across all repositories in your workspace, " +
            "grouped by Drift Level.",
        }),
        MavenBuildPlugins,
        enrich(MavenParentPom, {
            shortName: "parent",
            category: "Java",
            unit: "version",
            url: `drift?type=${MavenParentPom.name}&band=true&repos=false`,
            description: "Maven parent POM in use across all repositories in your workspace, " +
            "grouped by Drift Level.",
        }),
        enrich(LeinDeps, {
            shortName: "dependency",
            category: "Java",
            unit: "version",
            url: "drift?type=clojure-project-deps&band=true&repos=false",
            description: "Leiningen direct dependencies in use across all repositories in your workspace, " +
            "grouped by Drift Level.",
        }),
        enrich(DockerFrom, {
            shortName: "images",
            category: "Docker",
            unit: "tag",
            url: "fingerprint/docker-base-image/*?byOrg=true&trim=false",
            description: "Docker base images in use across all repositories in your workspace, " +
            "broken out by image label and repositories where used.",
        }),
        DockerfilePath,
        enrich(DockerPorts, {
            shortName: "ports",
            category: "Docker",
            unit: "port",
            url: "fingerprint/docker-ports/docker-ports?byOrg=true&trim=false",
            description: "Ports exposed in Docker configuration in use  across all repositories in your workspace, " +
            "broken out by port number and repositories where used.",
            manage: false,
        }),
        K8sSpecs,
        enrich(branchCount, {
            shortName: "branches",
            category: "Git",
            unit: "branch",
            url: `fingerprint/${branchCount.name}/${branchCount.name}?byOrg=true&trim=false`,
            description: "Number of Git branches across repositories in your workspace, " +
            "grouped by Drift Level.",
            manage: false,
        }),
        GitRecency,
        gitClassificationAspect({ deadDays: 365, maxBranches: 10 }),
        SpringClassificationAspect,
        DefaultBannerAspect,
        ReactiveWebUsageAspect,
        FrameworkAspect,
        CiAspect,
        BuildToolAspect,
        LanguageAspect,
        InfrastructureAspect,
        XmlBeanDefinitions,
        SpringBootAppClass,
        LogbackAspect,
        ConsoleLogging,
        JspFiles,
        YamlConfigFiles,
        DefaultPackageJavaFiles,
        GradleBuildFiles,
        ...idioms.HardCodedProperty,
        ...idioms.NonSpecificMvcAnnotation,
        ...idioms.DotStarUsage,
        ...idioms.FileIoUsage,
        ...idioms.MutableInjections,
        ...SpringBootTwelveFactors,
        ...BadJavaApis,
        ...optionalAspects,
    ];

    return aspects;
}
