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
    addressEvent,
    GitHubRepoRef,
    guid,
    Secrets,
} from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    DeclarationType,
    execPromise,
    isLazyProjectLoader,
    ParameterStyle,
    slackInfoMessage,
    slackSuccessMessage,
} from "@atomist/sdm";
import {
    bold,
    codeBlock,
    codeLine,
    italic,
} from "@atomist/slack-messages";
import { getAspectRegistrations } from "../aspect/aspectsFactory";
import { AspectRegistrations } from "../typings/types";

export const DisableAspectCommand: CommandHandlerRegistration<{ name: string }> = {
    name: "DisableAspect",
    description: "Disable an registered aspect",
    parameters: {
        name: {},
    },
    parameterStyle: ParameterStyle.Dialog,
    listener: async ci => {
        const regs = await getAspectRegistrations(ci.context, ci.parameters.name);

        if (regs.length > 0) {
            const aspectRegistration: AspectRegistrations.AspectRegistration = {
                ...regs[0],
                enabled: "false",
            };
            await ci.context.messageClient.send(aspectRegistration, addressEvent("AspectRegistration"));
            await ci.addressChannels(
                slackSuccessMessage(
                    "Aspect Registration",
                    `Successfully disabled aspect ${italic(aspectRegistration.displayName)}`),
            );
        }
    },
};

export const RegisterAspectCommand: CommandHandlerRegistration<{ owner: string, repo: string, name: string, displayName: string, shortName?: string, unit?: string, description: string, endpoint: string, category: string, token: string }> = {
    name: "RegisterAspect",
    description: "Register and deploy a new aspect",
    intent: ["register aspect", "deploy aspect"],
    parameters: {
        owner: {}, // uri: MappedParameters.GitHubOwner, declarationType: DeclarationType.Mapped },
        repo: {}, // uri: MappedParameters.GitHubRepository, declarationType: DeclarationType.Mapped },
        name: {},
        displayName: {},
        description: {},
        category: {},
        shortName: { required: false },
        unit: { required: false },
        endpoint: { required: false },

        token: { uri: Secrets.userToken("repo"), declarationType: DeclarationType.Secret },
    },
    listener: async ci => {

        const report = (await ci.promptFor<{ report: string }>({
            report: {
                type: {
                    kind: "single",
                    options: [
                        { value: "drift", description: "Drift Report" },
                        { value: "org", description: "Report by Org" },
                    ],
                },
            },
        })).report;

        // Deploy first
        let endpoint = ci.parameters.endpoint;
        let uuid;
        if (!endpoint) {
            const regs = await getAspectRegistrations(ci.context, ci.parameters.name);
            if (regs.length > 0) {
                uuid = regs[0].uuid;
            } else {
                uuid = guid();
            }

            await ci.addressChannels(
                slackInfoMessage(
                    "Aspect Registration",
                    `Cloning aspect repository ${bold(`${ci.parameters.owner}/${ci.parameters.repo}`)}`),
                { id: uuid });

            endpoint = await ci.configuration.sdm.projectLoader.doWithProject({ ...ci, id: GitHubRepoRef.from({ ...ci.parameters }) }, async p => {
                if (isLazyProjectLoader(ci.configuration.sdm.projectLoader)) {
                    await p.materialize();
                }

                await ci.addressChannels(
                    slackInfoMessage(
                        "Aspect Registration",
                        `Running ${codeLine("npm install")}`),
                    { id: uuid });
                await execPromise(
                    "npm",
                    ["ci"],
                    { cwd: p.baseDir });
                await ci.addressChannels(
                    slackInfoMessage(
                        "Aspect Registration",
                        `Running ${codeLine("npm run build")}`),
                    { id: uuid });
                await execPromise(
                    "npm",
                    ["run", "build"],
                    { cwd: p.baseDir });
                await ci.addressChannels(
                    slackInfoMessage(
                        "Aspect Registration",
                        `Deploying aspect`),
                    { id: uuid });
                const result = await execPromise(
                    "/Users/cdupuis/Downloads/google-cloud-sdk/bin/gcloud",
                    [
                        "functions",
                        "deploy",
                        `${ci.context.workspaceId}-${uuid}`,
                        "--entry-point",
                        "aspectEndpoint",
                        "--runtime",
                        "nodejs10",
                        "--trigger-http",
                        "--format",
                        "json",
                    ],
                    { cwd: p.baseDir });
                await ci.addressChannels(
                    slackSuccessMessage(
                        "Aspect Registration",
                        `Deployed aspect`),
                    { id: uuid });
                return JSON.parse(result.stdout).httpsTrigger.url;
            });
        }
        // Store registration
        const aspectRegistration: AspectRegistrations.AspectRegistration = {
            name: ci.parameters.name,
            displayName: ci.parameters.displayName,
            unit: ci.parameters.unit,
            shortName: ci.parameters.shortName,
            description: ci.parameters.description,
            category: ci.parameters.category,
            endpoint,
            uuid,
            url: report === "drift" ? `drift?type=${ci.parameters.name}&band=true&repos=true` : `fingerprint/${ci.parameters.name}/*?byOrg=true`,
            enabled: "true",
        };

        await ci.context.messageClient.send(aspectRegistration, addressEvent("AspectRegistration"));
        await ci.addressChannels(
            slackSuccessMessage(
                "Aspect Registration",
                `Successfully registered aspect ${italic(aspectRegistration.displayName)}:\n\n${codeBlock(JSON.stringify(aspectRegistration, undefined, 2))}`),
            { id: uuid },
        );
    },
};