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
    configurationValue,
    EventFired,
    GraphQL,
    HandlerContext,
    logger,
    MappedParameters,
    Success,
} from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    createJob,
    DeclarationType,
    EventHandlerRegistration,
    PreferenceScope,
    PreferenceStore,
    PreferenceStoreFactory,
} from "@atomist/sdm";
import {
    calculateFingerprintTask,
    CalculateFingerprintTaskParameters,
} from "@atomist/sdm-pack-aspect/lib/job/fingerprintTask";
import * as _ from "lodash";
import { getAspectRegistrations } from "../aspect/aspectsFactory";
import {
    OnDiscoveryJob,
    OnGitHubAppInstallation,
    ReposByProvider,
} from "../typings/types";

interface CreateFingerprintJobParameters {
    owner: string;
}

export const CreateFingerprintJobCommand: CommandHandlerRegistration<CreateFingerprintJobParameters> = {
    name: "CreateFingerprintJob",
    intent: "analyze org",
    description: "Trigger a background job to calculate all fingerprints across a given org",
    parameters: {
        owner: { uri: MappedParameters.GitHubOwner, declarationType: DeclarationType.Mapped, required: false },
    },
    listener: async ci => {
        await fingerprintProvider(ci.parameters.owner, undefined, true, ci.context);
    },
};

export const CreateFingerprintJob: EventHandlerRegistration<OnDiscoveryJob.Subscription> = {
    name: "CreateFingerprintJob",
    description: "Creates a job that calculates the fingerprints on every repo of an org",
    subscription: GraphQL.subscription("OnDiscoveryJob"),
    listener: async (e, ctx) => {
        const job = e.data.AtmJob[0];

        if (job.name.startsWith("RepositoryDiscovery")) {
            const event = JSON.parse(job.data) as EventFired<OnGitHubAppInstallation.Subscription>;

            if (!!event.data && !!event.data.GitHubAppInstallation) {
                const owner = event.data.GitHubAppInstallation[0].owner;
                const providerId = event.data.GitHubAppInstallation[0].gitHubAppResourceProvider.providerId;
                await fingerprintProvider(owner, providerId, false, ctx);
            } else {
                await fingerprintProvider(undefined, undefined, false, ctx);
            }
        }
        return Success;
    },
};

async function fingerprintProvider(owner: string, providerId: string, rerun: boolean, ctx: HandlerContext): Promise<void> {

    const result = await ctx.graphClient.query<ReposByProvider.Query, ReposByProvider.Variables>({
        name: "ReposByProvider",
        variables: {
            providerId,
            org: owner,
        },
    });

    const orgs = result.Org.map(org => {
        const provider = org.scmProvider;
        return {
            providerId: provider.providerId,
            name: org.owner,
            tasks: org.repos.map(repo => {
                return {
                    providerId: provider.providerId,
                    repoId: repo.id,
                    owner: repo.owner,
                    name: repo.name,
                    branch: repo.defaultBranch || "master",
                };
            }),
        };
    });

    const prefs: PreferenceStore = configurationValue<PreferenceStoreFactory>("sdm.preferenceStoreFactory")(ctx);

    const aspects = (await getAspectRegistrations(ctx)).filter(a => a.enabled === "true");
    const owners = _.uniq(aspects.map(a => a.owner));

    for (const org of orgs) {
        const analyzed = await prefs.get<boolean>(preferenceKey(org.name), { scope: PreferenceScope.Sdm, defaultValue: false });

        if (!analyzed || rerun) {
            // Create the fingerprinting job for this SDM
            await createFingerprintJob(ctx, org.tasks, org);

            // Now create fingerprinting jobs for all SDMs that are registered owners
            for (const o of owners) {
                await createFingerprintJob(ctx, org.tasks, org, o);
            }

            await prefs.put<boolean>(preferenceKey(org.name), true, { scope: PreferenceScope.Sdm });
        }
    }
}

async function createFingerprintJob(ctx: HandlerContext,
                                    parameters: any[],
                                    org: { name: string, providerId: string },
                                    owner?: string): Promise<void> {
    try {
        await createJob<CalculateFingerprintTaskParameters>({
                registration: owner,
                command: calculateFingerprintTask([]),
                parameters,
                name: `OrganizationAnalysis/${org.providerId}/${org.name}`,
                description: `Analyzing repositories in ${org.name}`,
                concurrentTasks: 2,
            },
            ctx);
    } catch (e) {
        logger.warn("Failed to create job for org '%s': %s", org.name, e.message);
    }
}

function preferenceKey(org: string): string {
    return `analyzed/${org}`;
}
