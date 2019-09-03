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
    GitHubRepoRef,
    logger,
    MappedParameters,
    QueryNoCacheOptions,
} from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    DeclarationType,
    execPromise,
    isLazyProjectLoader,
    ProviderType,
    PushImpactListenerInvocation,
} from "@atomist/sdm";
import {
    Aspect,
    fingerprintRunner,
} from "@atomist/sdm-pack-fingerprint";
import { sendFingerprintsToAtomist } from "@atomist/sdm-pack-fingerprint/lib/adhoc/fingerprints";
import { createFingerprintComputer } from "@atomist/sdm-pack-fingerprint/lib/machine/runner";
import * as _ from "lodash";
import {
    GitHubAppInstallationByOwner,
    IngestScmCommit,
    ScmCommitInput,
    ScmProviderById,
} from "../typings/types";

// tslint:disable-next-line:interface-over-type-literal
export type CalculateFingerprintTaskParameters = {
    providerId: string,
    repoId: string,
    owner: string,
    name: string,
    branch: string,
};

export function calculateFingerprintTask(aspects: Aspect[])
    : CommandHandlerRegistration<CalculateFingerprintTaskParameters> {
    return {
        name: "CalculateFingerprintTask",
        description: "Trigger calculation of fingerprints on the provided repository",
        parameters: {
            providerId: { description: "Id of the SCMProvider" },
            repoId: { description: "Id of the Repo" },
            owner: { uri: MappedParameters.GitHubOwner, declarationType: DeclarationType.Mapped },
            name: { uri: MappedParameters.GitHubRepository, declarationType: DeclarationType.Mapped },
            branch: { description: "Name of the branch" },
        },
        listener: async ci => {
            try {
                const provider = _.get(await ci.context.graphClient.query<ScmProviderById.Query, ScmProviderById.Variables>({
                    name: "ScmProviderById",
                    variables: {
                        providerId: ci.parameters.providerId,
                    },
                    options: QueryNoCacheOptions,
                }), "SCMProvider[0]");

                const app = _.get(await ci.context.graphClient.query<GitHubAppInstallationByOwner.Query, GitHubAppInstallationByOwner.Variables>({
                    name: "GitHubAppInstallationByOwner",
                    variables: {
                        name: ci.parameters.owner,
                    },
                    options: QueryNoCacheOptions,
                }), "GitHubAppInstallation[0]");

                const token = _.get(provider, "credential.secret") || _.get(app, "token.secret");

                if (!token) {
                    return;
                }

                const id = GitHubRepoRef.from({
                    owner: ci.parameters.owner,
                    repo: ci.parameters.name,
                    branch: ci.parameters.branch,
                    rawApiBase: provider.apiUrl,
                });
                const credentials = { token };

                await ci.configuration.sdm.projectLoader.doWithProject({ ...ci, id, credentials }, async p => {

                    if (isLazyProjectLoader(ci.configuration.sdm.projectLoader)) {
                        await p.materialize();
                    }

                    // git rev-parse HEAD = sha
                    const sha = (await execPromise("git", ["rev-parse", "HEAD"], { cwd: p.baseDir })).stdout.trim();
                    // const author = (await execPromise("git", ["show", "-s", "--format=%an"], { cwd: p.baseDir })).stdout.trim();
                    const email = (await execPromise("git", ["show", "-s", "--format=%ae"], { cwd: p.baseDir })).stdout.trim();
                    const ts = (await execPromise("git", ["show", "-s", "--format=%at"], { cwd: p.baseDir })).stdout.trim();
                    const message = (await execPromise("git", ["show", "-s", "--format=%B"], { cwd: p.baseDir })).stdout.trim();

                    // Ingest initial commit
                    const commit: ScmCommitInput = {
                        repoId: ci.parameters.repoId,
                        branchName: ci.parameters.branch,
                        timestamp: new Date(+ts * 1000).toISOString(),
                        email: {
                            address: email,
                        },
                        sha,
                        message,
                    };

                    await ci.context.graphClient.mutate<IngestScmCommit.Mutation, IngestScmCommit.Variables>({
                        name: "IngestScmCommit",
                        variables: {
                            providerId: provider.id,
                            commit,
                        },
                    });

                    // Run the fingerprint code
                    const pi: PushImpactListenerInvocation = {
                        context: ci.context,
                        configuration: ci.configuration,
                        project: p,
                        addressChannels: ci.addressChannels,
                        preferences: ci.preferences,
                        credentials: ci.credentials,
                        id,
                        impactedSubProject: p,
                        filesChanged: undefined,
                        commit: {
                            sha,
                            message,
                        },
                        push: {
                            repo: {
                                defaultBranch: ci.parameters.branch,
                                channels: [],
                                name: ci.parameters.name,
                                owner: ci.parameters.owner,
                                org: {
                                    owner: ci.parameters.owner,
                                    provider: {
                                        apiUrl: provider.apiUrl,
                                        providerId: ci.parameters.providerId,
                                        providerType: ProviderType.github_com,
                                    },
                                },
                            },
                            after: {
                                sha,
                                message,
                            },
                            commits: [{
                                sha,
                                message,
                            }],
                            branch: ci.parameters.branch,
                            timestamp: ts,
                        },
                    };

                    const fingerprintComputer = createFingerprintComputer(aspects);
                    await fingerprintRunner(aspects, [], fingerprintComputer, sendFingerprintsToAtomist)(pi);
                });
            } catch (e) {
                logger.error(`Fingerprinting task failed to execute: ${e.message}`);
            }
        },
    };
}
