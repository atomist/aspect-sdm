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
import { aspectSupport } from "@atomist/sdm-pack-aspect";
import {
    DefaultTargetDiffHandler,
    RebaseFailure,
    RebaseStrategy,
} from "@atomist/sdm-pack-fingerprints";
import { createAspects } from "./lib/aspect/aspects";
import {
    checkDiffHandler,
    checkGoalExecutionListener,
} from "./lib/aspect/check";
import { raisePrDiffHandler } from "./lib/aspect/praisePr";
import { FeedbackCommand } from "./lib/command/feedback";
import {
    OptInCommand,
    OptOutCommand,
} from "./lib/command/manageOptOut";
import { createPolicyLogOnPullRequest } from "./lib/event/policyLog";
import { complianceGoal } from "./lib/goal/compliance";
import {
    CreateFingerprintJob,
    CreateFingerprintJobCommand,
} from "./lib/job/createFingerprintJob";
import { calculateFingerprintTask } from "./lib/job/fingerprintTask";
import { gitHubCommandSupport } from "./lib/util/commentCommand";
import { MessageRoutingAutomationEventListener } from "./lib/util/MessageRoutingAutomationEventListener";
import { RemoveIntentsMetadataProcessor } from "./lib/util/removeIntents";

// Mode can be online or job
const mode = process.env.ATOMIST_ORG_VISUALIZER_MODE || "online";

export const configuration: Configuration = configure(async sdm => {

        const aspects = createAspects(sdm);

        if (mode === "online") {

            const compliance = complianceGoal(aspects);

            const pushImpact = new PushImpact()
                .withExecutionListener(checkGoalExecutionListener(compliance));

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
                        commands: [OptInCommand, OptOutCommand, FeedbackCommand],
                    }),
            );

            // Install default workflow
            aspects.filter(a => !!a.workflows && a.workflows.length > 0)
                .forEach(a => a.workflows = [checkDiffHandler(sdm), raisePrDiffHandler(sdm, DefaultTargetDiffHandler)]);

            return {
                analyze: {
                    goals: [
                        [pushImpact],
                        [compliance],
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

            cfg.metadataProcessor = new RemoveIntentsMetadataProcessor();

            return cfg;
        },

        postProcessors: [
            configureHumio,
        ],
    });
