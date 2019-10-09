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
    Configuration,
    GraphQL,
} from "@atomist/automation-client";
import { configureHumio } from "@atomist/automation-client-ext-humio";
import {
    CachingProjectLoader,
    GitHubLazyProjectLoader,
    GoalSigningScope,
    PushImpact,
    pushTest,
} from "@atomist/sdm";
import { configure } from "@atomist/sdm-core";
import { aspectSupport } from "@atomist/sdm-pack-aspect";
import { DefaultAspectRegistry } from "@atomist/sdm-pack-aspect/lib/aspect/DefaultAspectRegistry";
import { calculateFingerprintTask } from "@atomist/sdm-pack-aspect/lib/job/fingerprintTask";
import {
    RebaseFailure,
    RebaseStrategy,
} from "@atomist/sdm-pack-fingerprint";
import * as _ from "lodash";
import { createAspects } from "./lib/aspect/aspects";
import { RegistrationsBackedAspectsFactory } from "./lib/aspect/aspectsFactory";
import {
    checkDiffHandler,
    checkGoalExecutionListener,
} from "./lib/aspect/check";
import {
    complianceDiffHandler,
    complianceGoalExecutionListener,
} from "./lib/aspect/compliance";
import { raisePrDiffHandler } from "./lib/aspect/praisePr";
import { createScorers } from "./lib/aspect/scorers";
import { createWorkspaceScorers } from "./lib/aspect/workspaceScorers";
import { broadcastTargetCommand } from "./lib/command/broadcastTarget";
import { unsetTargetCommand } from "./lib/command/disableTarget";
import { FeedbackCommand } from "./lib/command/feedback";
import { IngestOrg } from "./lib/command/ingestOrg";
import {
    DisableAspectReportCommand,
    EnableAspectReportCommand,
    UpdateAspectCommand,
} from "./lib/command/manageAspectReport";
import {
    OptInCommand,
    OptOutCommand,
} from "./lib/command/manageOptOut";
import { setTargetCommand } from "./lib/command/setTarget";
import { tryTargetCommand } from "./lib/command/tryTarget";
import { createPolicyLogOnPullRequest } from "./lib/event/policyLog";
import {
    createFingerprintJob,
    createFingerprintJobCommand,
} from "./lib/job/createFingerprintJob";
import { ProviderType } from "./lib/typings/types";
import { gitHubCommandSupport } from "./lib/util/commentCommand";
import { MessageRoutingAutomationEventListener } from "./lib/util/MessageRoutingAutomationEventListener";
import { RemoveIntentsMetadataProcessor } from "./lib/util/removeIntents";

// Mode can be online or job
const mode = process.env.ATOMIST_ORG_VISUALIZER_MODE || "online";

export const configuration: Configuration = configure(async sdm => {

        const aspects = createAspects(sdm);

        if (mode === "online") {

            const pushImpact = new PushImpact()
                .withExecutionListener(complianceGoalExecutionListener())
                .withExecutionListener(checkGoalExecutionListener());

            if (process.env.NODE_ENV === "production") {
                sdm.addIngester(GraphQL.ingester({ path: "./lib/graphql/ingester/AspectRegistration.graphql" }));
            }

            sdm.addCommand(OptInCommand)
                .addCommand(OptOutCommand)
                .addCommand(DisableAspectReportCommand)
                .addCommand(EnableAspectReportCommand)
                .addCommand(UpdateAspectCommand)
                .addCommand(IngestOrg)
                .addCommand(tryTargetCommand(sdm, aspects))
                .addCommand(setTargetCommand(sdm, aspects))
                .addCommand(unsetTargetCommand(sdm, aspects))
                .addCommand(broadcastTargetCommand(sdm, aspects));

            sdm.addExtensionPacks(
                aspectSupport({
                    aspects,
                    scorers: createScorers(sdm),
                    workspaceScorers: createWorkspaceScorers(),
                    weightings: {
                        "spring-boot-version": 3,
                        "hard-coded-property": 2,
                    },
                    aspectsFactory: RegistrationsBackedAspectsFactory,

                    rebase: {
                        rebase: true,
                        rebaseStrategy: RebaseStrategy.Ours,
                        onRebaseFailure: RebaseFailure.DeleteBranch,
                    },

                    goals: {
                        pushImpact,
                    },

                    exposeWeb: true,
                    secureWeb: true,
                }),
                gitHubCommandSupport(
                    {
                        commands: [
                            OptInCommand,
                            OptOutCommand,
                            FeedbackCommand,
                        ],
                    }),
            );

            const aspectRegistry = new DefaultAspectRegistry({
                idealStore: undefined,
                problemStore: undefined,
                aspects,
                undesirableUsageChecker: undefined,
                configuration,
            });

            // Install default workflow
            aspects.forEach(a => a.workflows = [
                complianceDiffHandler(sdm),
                checkDiffHandler(sdm, aspectRegistry),
                raisePrDiffHandler(sdm, aspectRegistry, async () => []),
            ]);

            return {
                analyze: {
                    test: pushTest("Is GitHub.com", async p => {
                        return _.get(p.push, "repo.org.provider.providerType", ProviderType.github_com) === ProviderType.github_com;
                    }),
                    goals: [
                        [pushImpact],
                    ],
                },
            };
        } else {
            sdm.addExtensionPacks(
                aspectSupport({
                    aspects,
                    scorers: createScorers(sdm),
                    workspaceScorers: createWorkspaceScorers(),
                    weightings: {
                        "spring-boot-version": 3,
                        "hard-coded-property": 2,
                    },
                    aspectsFactory: RegistrationsBackedAspectsFactory,

                    exposeWeb: false,
                    registerAspects: false,
                }),
            );
            sdm.addEvent(createFingerprintJob(sdm))
                .addEvent(createPolicyLogOnPullRequest(aspects))
                .addCommand(createFingerprintJobCommand(sdm))
                .addCommand(calculateFingerprintTask(sdm, aspects));

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

            cfg.metadataProcessor = new RemoveIntentsMetadataProcessor();

            /*cfg.sdm.postgres = {
                user: "xxx",
                password: "xxx",
                database: "org_viz",
                host: "localhost",
                port: 5433,
                ssl: {
                    rejectUnauthorized: false,
                    ca: fs.readFileSync("./server-ca.pem").toString(),
                    key: fs.readFileSync("./client-key.pem").toString(),
                    cert: fs.readFileSync("./client-cert.pem").toString(),
                },
            };*/

            return cfg;
        },

        postProcessors: [
            configureHumio,
        ],
    });
