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
import { CommandHandlerRegistration } from "@atomist/sdm";
import {
    IngestScmOrgs,
    IngestScmRepos,
    OwnerType,
    ReposByOrg,
    ScmRepoInput,
    ScmReposInput,
} from "../typings/types";
import { api } from "../util/gitHubApi";

// tslint:disable-next-line:interface-over-type-literal
export type IngestOrgsParameters = { owner: string, providerId?: string };

export const IngestOrg: CommandHandlerRegistration<IngestOrgsParameters> = {
    name: "IngestOrg",
    intent: "ingest org",
    description: "Ingest organization and repositories into the Graph",
    tags: ["github"],
    parameters: {
        owner: {},
        providerId: { required: false, defaultValue: "zjlmxjzwhurspem"},
    },
    listener: async ci => {

        const gh = api(undefined, "https://api.github.com");
        const ghOrg = (await gh.orgs.get({
            org: ci.parameters.owner,
        })).data;

        const ingestOrg = {
            id: ghOrg.id.toString(),
            name: ghOrg.login,
            ownerType: ghOrg.type === "Organization" ? OwnerType.organization : OwnerType.user,
            url: ghOrg.html_url,
        };

        const org = await ci.context.graphClient.mutate<IngestScmOrgs.Mutation, IngestScmOrgs.Variables>({
            name: "IngestScmOrgs",
            variables: {
                scmOrgsInput: { orgs: [ingestOrg] },
                scmProviderId: `${ci.context.workspaceId}_${ci.parameters.providerId}`,
            },
        });

        const orgId = { owner: ingestOrg.name, ownerType: ingestOrg.ownerType, id: org.ingestSCMOrgs[0].id };

        logger.info(`Ingesting repos for org '${orgId.owner}'`);

        const existingRepos = (await ci.context.graphClient.query<ReposByOrg.Query, ReposByOrg.Variables>({
            name: "reposByOrg",
            variables: {
                owner: orgId.owner,
                providerId: ci.parameters.providerId,
            },
        })).Repo;

        let options;
        if (orgId.ownerType === OwnerType.organization) {
            options = gh.repos.listForOrg.endpoint.merge({ org: orgId.owner, per_page: 100 });
        } else {
            options = gh.repos.listForUser.endpoint.merge({ username: orgId.owner, per_page: 100 });
        }

        let repos = 0;
        for await (const response of gh.paginate.iterator(options)) {
            const newRepos = response.data.filter((r: any) => !r.archived).filter((r: any) => !existingRepos.some(er => er.name === r.name));

            const scmIngest: ScmReposInput = {
                orgId: orgId.id,
                owner: orgId.owner,
                repos: [],
            };

            for await (const newRepo of newRepos) {
                logger.debug(`Preparing repo ${newRepo.full_name}`);

                const ingest: ScmRepoInput = {
                    name: newRepo.name,
                    repoId: newRepo.id.toString(),
                    url: newRepo.html_url,
                    defaultBranch: newRepo.default_branch,
                };

                scmIngest.repos.push(ingest);
                repos++;
            }

            if (scmIngest.repos.length > 0) {
                await ci.context.graphClient.mutate<IngestScmRepos.Mutation, IngestScmRepos.Variables>({
                    name: "ingestScmRepos",
                    variables: {
                        providerId: `${ci.context.workspaceId}_${ci.parameters.providerId}`,
                        repos: scmIngest,
                    },
                });
            }
        }

        logger.info(`Ingesting repos for org '${orgId.owner}' completed`);

    },
};
