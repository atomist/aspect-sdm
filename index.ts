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

import { Configuration } from "@atomist/automation-client";
import { configureDashboardNotifications } from "@atomist/automation-client-ext-dashboard";
import { configureHumio } from "@atomist/automation-client-ext-humio";
import {
    CachingProjectLoader,
    GitHubLazyProjectLoader,
    GoalSigningScope,
    PushImpact,
} from "@atomist/sdm";
import { configure } from "@atomist/sdm-core";
import {
    aspectSupport,
    CiAspect,
    JavaBuild,
    StackAspect,
} from "@atomist/sdm-pack-aspect";
import {
    registerCategories,
    registerReportDetails,
} from "@atomist/sdm-pack-aspect/lib/customize/categories";
import { LeinDeps } from "@atomist/sdm-pack-clojure/lib/fingerprints/clojure";
import {
    DockerfilePath,
    DockerFrom,
    DockerPorts,
} from "@atomist/sdm-pack-docker";
import { K8sSpecs } from "./lib/aspect/k8s/specAspect";
import { NpmDependencies } from "./lib/aspect/node/npmDependencies";
import { TypeScriptVersion } from "./lib/aspect/node/TypeScriptVersion";
import { DirectMavenDependencies } from "./lib/aspect/spring/directMavenDependencies";
import { SpringBootStarter } from "./lib/aspect/spring/springBootStarter";
import { SpringBootVersion } from "./lib/aspect/spring/springBootVersion";
import { TravisScriptsAspect } from "./lib/aspect/travis/travisAspect";
import { CreatePolicyLogOnPullRequest } from "./lib/event/policyLog";
import {
    CreateFingerprintJob,
    CreateFingerprintJobCommand,
} from "./lib/job/createFingerprintJob";
import { calculateFingerprintTask } from "./lib/job/fingerprintTask";

// Mode can be online or job
const mode = process.env.ATOMIST_ORG_VISUALIZER_MODE || "online";

export const configuration: Configuration = configure(async sdm => {

        const isStaging = sdm.configuration.endpoints.api.includes("staging");

        const optionalAspects = isStaging ? [LeinDeps] : [];

        const aspects = [
            DockerFrom,
            DockerfilePath,
            DockerPorts,
            SpringBootStarter,
            TypeScriptVersion,
            NpmDependencies,
            TravisScriptsAspect,
            StackAspect,
            CiAspect,
            JavaBuild,
            SpringBootVersion,
            DirectMavenDependencies,
            K8sSpecs,
            ...optionalAspects,
        ];
        const handlers = [];

        // TODO cd merge into one call
        registerCategories(TypeScriptVersion, "Node.js");
        registerReportDetails(TypeScriptVersion, {
            name: "TypeScript versions",
            shortName: "version",
            unit: "version",
            url: "fingerprint/typescript-version/typescript-version?byOrg=true",
            description: "TypeScript versions in use across all repositories in your workspace, " +
                "broken out by version and repositories that use each version.",
        });
        registerCategories(NpmDependencies, "Node.js");
        registerReportDetails(NpmDependencies, {
            shortName: "dependency",
            unit: "version",
            url: "drift?type=npm-project-deps&band=true&showAll=true",
            description: "Node direct dependencies in use across all repositories in your workspace, " +
                "grouped by Drift Level.",
        });
        registerCategories(SpringBootStarter, "Java");
        registerCategories(JavaBuild, "Java");
        registerCategories(SpringBootVersion, "Java");
        registerCategories(DirectMavenDependencies, "Java");
        registerReportDetails(DirectMavenDependencies, {
            shortName: "dependency",
            unit: "version",
            url: "drift?type=maven-direct-dep&band=true&showAll=true",
            description: "Maven direct dependencies in use across all repositories in your workspace, " +
                "grouped by Drift Level.",
        });
        if (isStaging) {
            registerCategories(LeinDeps, "Java");
            registerReportDetails(LeinDeps, {
                shortName: "dependency",
                unit: "version",
                url: "drift?type=clojure-project-deps&band=true&showAll=true",
                description: "Leiningen direct dependencies in use across all repositories in your workspace, " +
                    "grouped by Drift Level.",
            });
        }
        registerCategories(DockerFrom, "Docker");
        registerReportDetails(DockerFrom, {
            name: "Docker base images",
            shortName: "images",
            unit: "tag",
            url: "fingerprint/docker-base-image/*?byOrg=true&presence=false&progress=false&otherLabel=false&trim=false",
            description: "Docker base images in use across all repositories in your workspace, " +
                "broken out by image label and repositories where used.",
        });
        registerCategories(DockerPorts, "Docker");
        registerReportDetails(DockerPorts, {
            shortName: "ports",
            unit: "port",
            url: "fingerprint/docker-ports/*?byOrg=true&presence=false&progress=false&otherLabel=false&trim=false",
            description: "Ports exposed in Docker configuration in use  across all repositories in your workspace, " +
                "broken out by port number and repositories where used.",
            manage: false,
        });

        if (mode === "online") {
            const pushImpact = new PushImpact();

            sdm.addExtensionPacks(
                aspectSupport({
                    pushImpactGoal: pushImpact,
                    aspects,
                }),
            );

            return {
                analyze: {
                    goals: pushImpact,
                },
            };
        } else {
            sdm.addEvent(CreateFingerprintJob);
            sdm.addEvent(CreatePolicyLogOnPullRequest);
            sdm.addCommand(CreateFingerprintJobCommand);
            sdm.addCommand(calculateFingerprintTask(aspects, handlers));
            return {};
        }
    },
    {
        name: "Aspect Software Delivery Machine",
        preProcessors: async cfg => {

            // Do not surface the single pushImpact goal set in every UI
            cfg.sdm.tagGoalSet = async () => [{ name: "@atomist/sdm/internal" }];
            // Use lazy project loader for this SDM
            cfg.sdm.projectLoader = new GitHubLazyProjectLoader(new CachingProjectLoader());
            // Disable goal hooks from repos
            cfg.sdm.goal = {
                hooks: false,
            };
            // For safety we sign every goal
            cfg.sdm.goalSigning = {
                ...cfg.sdm.goalSigning,
                scope: GoalSigningScope.All,
            };

            if (mode === "job") {
                cfg.name = `${cfg.name}-job`;
                cfg.ws.termination = {
                    graceful: true,
                    gracePeriod: 1000 * 60 * 10,
                };
            }

            return cfg;
        },

        postProcessors: [
            configureHumio,
            configureDashboardNotifications,
        ],
    });
