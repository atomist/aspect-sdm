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
    GraphQL,
    Secrets,
    Success,
    TokenCredentials,
} from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    createJob,
    DeclarationType,
    EventHandlerRegistration,
    NamedParameter,
    resolveCredentialsPromise,
    SoftwareDeliveryMachine,
    toParametersListing,
} from "@atomist/sdm";
import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import * as _ from "lodash";
import {
    OnComment,
    ProviderType,
} from "../typings/types";
import { api } from "./gitHubApi";

export function invokeCommandOnComment(sdm: SoftwareDeliveryMachine,
                                       command: CommandHandlerRegistration<any> | Array<CommandHandlerRegistration<any>>)
    : EventHandlerRegistration<OnComment.Subscription> {
    return {
        name: "InvokeCommandOnComment",
        description: "Invoke commands from issue or pull request comments",
        subscription: GraphQL.subscription("OnComment"),
        parameters: {
            orgToken: { uri: Secrets.OrgToken, declarationType: DeclarationType.Secret },
        },
        listener: async (e, ctx) => {
            const commands = toArray(command);
            const comment = e.data.Comment[0];
            const repo = _.get(comment, "issue.repo") || _.get(comment, "pullRequest.repo") as OnComment.Repo;
            const issueNumber = _.get(comment, "issue.number") || _.get(comment, "pullRequest.number");

            if (!repo || repo.org.provider.providerType !== ProviderType.github_com) {
                return Success;
            }

            // First attempt to extract the command from the comment
            const body = comment.body.trim();
            if (!(body.startsWith("@atomist ") || body.startsWith("/atomist "))) {
                return Success;
            }

            const tokens = body.split(" ");
            const intent: string[] = [];
            let ix = 0;
            for (let i = 1; i < tokens.length; i++) {
                const token = tokens[i];
                if (token.startsWith("-")) {
                    ix = i;
                    break;
                } else {
                    intent.push(token);
                }
            }
            const args = require("yargs-parser")(tokens.slice(ix));
            delete args._;
            const cmd = commands.filter(c => !!c.intent && c.intent.length > 0)
                .find(c => toArray(c.intent).some(i => i === intent.join(" ")));

            if (!cmd) {
                return Success;
            }

            const credentials = await resolveCredentialsPromise(sdm.configuration.sdm.credentialsResolver.eventHandlerCredentials(ctx)) as TokenCredentials;
            const github = api(credentials.token, repo.org.provider.apiUrl);

            // Check the comment author's permission on the repo
            const permission = await github.repos.getCollaboratorPermissionLevel(
                {
                    owner: repo.owner,
                    repo: repo.name,
                    username: comment.by.login,
                });
            if (!["admin", "write"].includes(permission.data.permission)) {
                return Success;
            }

            // Now schedule a job to run the command
            await createJob({
                command: cmd.name,
                description: "",
                parameters: {
                    "owner": repo.owner,
                    "name": repo.name,
                    ...args,
                    "comment.apiUrl": repo.org.provider.apiUrl,
                    "comment.owner": repo.owner,
                    "comment.repo": repo.name,
                    "comment.issueNumber": issueNumber,
                    "comment.number": comment.commentId,
                    "comment.command": body,
                },
                concurrentTasks: 1,
            }, ctx);

            return Success;
        },
    };
}

export const ApiUrlParameter: NamedParameter = {
    name: "comment.apiUrl",
    description: "Owner of the issue",
    required: false,
};
export const OwnerParameter: NamedParameter = {
    name: "comment.owner",
    description: "Owner of the issue",
    required: false,
};
export const RepoParameter: NamedParameter = {
    name: "comment.repo",
    description: "Repo of the issue",
    required: false,
};
export const NumberParameter: NamedParameter = {
    name: "comment.number",
    description: "Number of the issue",
    required: false,
};
export const IssueNumberParameter: NamedParameter = {
    name: "comment.issueNumber",
    description: "Number of the issue",
    required: false,
};
export const CommandParameter: NamedParameter = {
    name: "comment.command",
    description: "command of the issue",
    required: false,
};

export function invocableFromComment(c: CommandHandlerRegistration<any>): CommandHandlerRegistration<any> {
    const params = toParametersListing(c.parameters || {} as any);
    params.parameters.push(ApiUrlParameter, OwnerParameter, RepoParameter, NumberParameter, CommandParameter, IssueNumberParameter);
    c.parameters = params;
    decorateMessageClient(c);
    return c;
}

function decorateMessageClient(cmd: CommandHandlerRegistration<any>): void {
    const listener = cmd.listener;
    cmd.listener = async cli => {
        const parameters = cli.parameters as any;
        if (!!parameters[OwnerParameter.name] && !!parameters[RepoParameter.name] && !!parameters[NumberParameter.name]) {
            cli.context.messageClient.respond = async (msg, options) => {
                await github.issues.createComment({
                    owner: parameters[OwnerParameter.name],
                    repo: parameters[RepoParameter.name],
                    issue_number: parameters[IssueNumberParameter.name],
                    body: `> ${parameters[CommandParameter.name]}\n\n${msg}`,
                });
            };
            const credentials = await resolveCredentialsPromise(cli.configuration.sdm.credentialsResolver.commandHandlerCredentials(cli.context, GitHubRepoRef.from({
                owner: parameters[OwnerParameter.name],
                repo: parameters[RepoParameter.name],
            }))) as TokenCredentials;

            const github = api(credentials.token, parameters[ApiUrlParameter.name]);
            try {
                const result = await listener(cli);
                if (!result || result.code === 0) {
                    await github.reactions.createForIssueComment({
                        comment_id: parameters[NumberParameter.name],
                        content: "+1",
                        owner: parameters[OwnerParameter.name],
                        repo: parameters[RepoParameter.name],
                    });
                } else {
                    await github.reactions.createForIssueComment({
                        comment_id: parameters[NumberParameter.name],
                        content: "-1",
                        owner: parameters[OwnerParameter.name],
                        repo: parameters[RepoParameter.name],
                    });
                }
                return result;
            } catch (e) {
                await github.reactions.createForIssueComment({
                    comment_id: parameters[NumberParameter.name],
                    content: "-1",
                    owner: parameters[OwnerParameter.name],
                    repo: parameters[RepoParameter.name],
                });
            }
        } else {
            return listener(cli);
        }

    };
}
