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

import { addressEvent } from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    ParameterStyle,
    slackSuccessMessage,
} from "@atomist/sdm";
import {
    codeBlock,
    italic,
} from "@atomist/slack-messages";
import { getAspectRegistrations } from "../aspect/aspectsFactory";
import { AspectRegistrations } from "../typings/types";

export const DisableAspectCommand: CommandHandlerRegistration<{ name: string }> = {
    name: "DisableAspect",
    description: "Disable an registered aspect",
    intent: ["disable aspect"],
    parameters: {
        name: {},
    },
    parameterStyle: ParameterStyle.Dialog,
    listener: async ci => {
        const regs = await getAspectRegistrations(ci.context, ci.parameters.name);

        if (regs.length > 0) {
            const aspectRegistration: AspectRegistrations.AspectRegistration = {
                ...regs[0],
                endpoint: undefined,
                owner: undefined,
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

export const RegisterAspectCommand: CommandHandlerRegistration<{ owner: string, name: string, displayName: string, shortName?: string, unit?: string, description: string, category: string }> = {
    name: "RegisterAspect",
    description: "Register a new aspect",
    intent: ["register aspect"],
    parameterStyle: ParameterStyle.Dialog,
    parameters: {
        owner: { description: "Name of SDM that owns this aspect" },
        name: { description: "Aspect name (often referred to as type"},
        displayName: { description: "Aspect display name using in PR bodies and on the web-app"},
        description: { description: "Description of the aspect on the web-app"},
        category: { description: "Category of the aspect (shows up as tab on the web-app)"},
        shortName: { description: "Short name of the aspect (used in search boxes etc)", required: false },
        unit: { description: "Unit of the aspect (version, tags etc)", required: false },
    },
    listener: async ci => {

        const report = (await ci.promptFor<{ report: string }>({
            report: {
                description: "Kind of report to make available on the web-app",
                type: {
                    kind: "single",
                    options: [
                        { value: "drift", description: "Drift Report" },
                        { value: "sorg", description: "Report by Org (single name)" },
                        { value: "morg", description: "Report by Org (multiple names)" },
                    ],
                },
            },
        })).report;

        const regs = await getAspectRegistrations(ci.context, ci.parameters.name);

        // Store registration
        const aspectRegistration: AspectRegistrations.AspectRegistration = {
            name: ci.parameters.name,
            owner: ci.parameters.owner,
            displayName: ci.parameters.displayName,
            unit: ci.parameters.unit,
            shortName: ci.parameters.shortName,
            description: ci.parameters.description,
            category: ci.parameters.category,
            url: report === "drift" ? `drift?type=${ci.parameters.name}&band=true&repos=true` :
                (report === "morg" ? `fingerprint/${ci.parameters.name}/*?byOrg=true&trim=false` :
                    `fingerprint/${ci.parameters.name}/${ci.parameters.name}?byOrg=true&trim=false` ),
            enabled: "true",
        };

        await ci.context.messageClient.send(aspectRegistration, addressEvent("AspectRegistration"));
        await ci.addressChannels(
            slackSuccessMessage(
                "Aspect Registration",
                `Successfully registered aspect ${italic(aspectRegistration.displayName)}:\n\n${codeBlock(JSON.stringify(aspectRegistration, undefined, 2))}`),
        );
    },
};
