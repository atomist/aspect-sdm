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
    goal,
    GoalSigningScope,
    PushImpact,
    SdmGoalState,
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
    DockerPorts,
} from "@atomist/sdm-pack-docker";
import {
    DefaultTargetDiffHandler,
    RebaseFailure,
    RebaseStrategy,
} from "@atomist/sdm-pack-fingerprints";
import {
    aspectOf,
    displayName,
    displayValue,
} from "@atomist/sdm-pack-fingerprints/lib/machine/Aspects";
import * as _ from "lodash";
import {
    checkDiffHandler,
    checkGoalExecutionListener,
} from "./lib/aspect/check";
import { DockerFrom } from "./lib/aspect/docker/docker";
import { branchCount } from "./lib/aspect/git/branchCount";
import { K8sSpecs } from "./lib/aspect/k8s/specAspect";
import { MavenDirectDependencies } from "./lib/aspect/maven/mavenDirectDependencies";
import { MavenParentPom } from "./lib/aspect/maven/parentPom";
import { NpmDependencies } from "./lib/aspect/node/npmDependencies";
import { TypeScriptVersion } from "./lib/aspect/node/TypeScriptVersion";
import { raisePrDiffHandler } from "./lib/aspect/praisePr";
import { SpringBootStarter } from "./lib/aspect/spring/springBootStarter";
import { SpringBootVersion } from "./lib/aspect/spring/springBootVersion";
import { TravisScriptsAspect } from "./lib/aspect/travis/travisAspect";
import { FeedbackCommand } from "./lib/command/feedback";
import {
    OptInCommand,
    OptOutCommand,
} from "./lib/command/manageOptOut";
import { createPolicyLogOnPullRequest } from "./lib/event/policyLog";
import {
    CreateFingerprintJob,
    CreateFingerprintJobCommand,
} from "./lib/job/createFingerprintJob";
import { calculateFingerprintTask } from "./lib/job/fingerprintTask";
import { gitHubCommandSupport } from "./lib/util/commentCommand";
import { MessageRoutingAutomationEventListener } from "./lib/util/MessageRoutingAutomationEventListener";

export interface ComplicanceData {
    policies: Array<{
        type: string;
        name: string;
        sha: string;
        data: string;
    }>;
    differences: Array<{
        type: string;
        name: string;
        sha: string;
        data: string;
    }>;
    url: string;
}

// Mode can be online or job
const mode = process.env.ATOMIST_ORG_VISUALIZER_MODE || "online";

export const configuration: Configuration = configure(async sdm => {

        const isStaging = sdm.configuration.endpoints.api.includes("staging");
        const optionalAspects = isStaging ? [] : [];

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
            MavenDirectDependencies,
            MavenParentPom,
            K8sSpecs,
            branchCount,
            LeinDeps,
            ...optionalAspects,
        ];

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
            url: "drift?type=npm-project-deps&band=true",
            description: "Node direct dependencies in use across all repositories in your workspace, " +
                "grouped by Drift Level.",
        });
        registerCategories(MavenDirectDependencies, "Java");
        registerReportDetails(MavenDirectDependencies, {
            shortName: "dependency",
            unit: "version",
            url: "drift?type=maven-direct-dep&band=true",
            description: "Maven declared dependencies in use across all repositories in your workspace, " +
                "grouped by Drift Level.",
        });
        registerCategories(MavenParentPom, "Java");
        registerReportDetails(MavenParentPom, {
            shortName: "parent",
            unit: "version",
            url: `drift?type=${MavenParentPom.name}&band=true`,
            description: "Maven parent POM in use across all repositories in your workspace, " +
                "grouped by Drift Level.",
        });
        if (isStaging) {
            registerCategories(LeinDeps, "Java");
            registerReportDetails(LeinDeps, {
                shortName: "dependency",
                unit: "version",
                url: "drift?type=clojure-project-deps&band=true",
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
        registerCategories(branchCount, "Git");
        registerReportDetails(branchCount, {
            shortName: "branches",
            unit: "branch",
            url: `fingerprint/${branchCount.name}/${branchCount.name}?byOrg=true&presence=false&progress=false&otherLabel=false&trim=false`,
            description: "Number of Git branches across repositories in your workspace, " +
                "grouped by Drift Level.",
            manage: false,
        });

        if (mode === "online") {

            const policyCompliance = goal({
                uniqueName: "atomist#policy",
                displayName: "Policy Compliance",
                descriptions: {
                    failed: "Policy differences detected",
                    completed: "No policy differences",
                },
            }, async gi => {
                const { goalEvent } = gi;
                if (!!goalEvent.data) {
                    const data = JSON.parse(goalEvent.data) as ComplicanceData;

                    // Write to rolar log
                    const rows = _.map(_.groupBy(data.differences, "type"), (v, k) => {
                        const aspect = aspectOf({ type: k }, aspects);
                        const targetCount = data.policies.filter(p => p.type === k).length;
                        return `## ${aspectOf({ type: k }, aspects).displayName}

${targetCount} ${targetCount === 1 ? "Policy" : "Polices"} set - Compliance ${((1 - (v.length / targetCount)) * 100).toFixed(0)}%

${v.map(d => {
                            const target = data.policies.find(p => p.type === d.type && p.name === d.name);
                            return `* ${displayName(aspect, d)} at ${displayValue(aspect, d)} - Policy: ${displayValue(aspect, target)}`;
                        }).join("\n")}`;
                    });

                    gi.progressLog.write(`Policy differences

The following differences from set policies have been detected:

${rows.join("\n\n")}`);

                    return {
                        description: `${data.differences.length} policy ${data.differences.length === 1 ? "difference" : "differences"}`,
                        state: data.differences.length === 0 ? SdmGoalState.success : SdmGoalState.failure,
                        phase: `Compliance ${((1 - (data.differences.length / data.policies.length)) * 100).toFixed(0)}%`,
                        externalUrls: [{
                            label: "Details",
                            url: data.url,
                        }],
                    };
                }

                return {
                    state: SdmGoalState.success,
                };
            });

            const pushImpact = new PushImpact()
                .withExecutionListener(checkGoalExecutionListener(policyCompliance));

            sdm.addExtensionPacks(
                aspectSupport({
                    aspects,

                    rebase: {
                        rebase: true,
                        rebaseStrategy: RebaseStrategy.Ours,
                        onRebaseFailure: RebaseFailure.DeleteBranch,
                    },

                    goals: {
                        pushImpact,
                    },

                    undesirableUsageChecker: {
                        check: () => undefined,
                    },

                    exposeWeb: true,
                }),
                gitHubCommandSupport(
                    {
                        command: [OptInCommand, OptOutCommand, FeedbackCommand],
                    }),
            );

            // Install default workflow
            aspects.filter(a => !!a.workflows && a.workflows.length > 0)
                .forEach(a => a.workflows = [checkDiffHandler(sdm), raisePrDiffHandler(sdm, DefaultTargetDiffHandler)]);

            return {
                analyze: {
                    goals: [
                        [pushImpact],
                        [policyCompliance],
                    ],
                },
            };
        } else {
            sdm.addEvent(CreateFingerprintJob);
            sdm.addEvent(createPolicyLogOnPullRequest(aspects));
            sdm.addCommand(CreateFingerprintJobCommand);
            sdm.addCommand(calculateFingerprintTask(aspects));

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
            }

            cfg.ws.termination = {
                graceful: true,
                gracePeriod: 1000 * 60 * 10,
            };

            const isStaging = cfg.endpoints.api.includes("staging");
            if (!isStaging) {
                cfg.listeners = [
                    ...(cfg.listeners || []),
                    new MessageRoutingAutomationEventListener(),
                ];
            }

            return cfg;
        },

        postProcessors: [
            configureHumio,
            configureDashboardNotifications,
        ],
    });
