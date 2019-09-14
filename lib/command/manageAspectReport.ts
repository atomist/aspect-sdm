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
    slackInfoMessage,
    slackSuccessMessage,
} from "@atomist/sdm";
import { italic } from "@atomist/slack-messages";
import { getAspectRegistrations } from "../aspect/aspectsFactory";
import {
    AspectRegistrations,
    AspectRegistrationState,
} from "../typings/types";

export const DisableAspectReportCommand: CommandHandlerRegistration = {
    name: "DisableAspectReport",
    description: "Disable an aspect report",
    intent: ["disable report"],
    autoSubmit: true,
    listener: async ci => {
        const regs = (await getAspectRegistrations(ci.context) || []).filter(a => a.state === AspectRegistrationState.Enabled);
        if (regs.length === 0) {
            return ci.addressChannels(
                slackInfoMessage(
                    "Disable Report",
                    "This workspace currently doesn't have any aspects reports to disable"));
        }

        const params = await ci.promptFor<{ name: string }>(
            {
                name: {
                    description: "Select aspect report to disable",
                    type: {
                        options: regs.map(r => ({ value: r.name, description: `${r.displayName} - ${r.owner}` })),
                        kind: "single",
                    },
                },
            },
        );

        if (!!params && !!params.name) {
            const aspectRegistration: AspectRegistrations.AspectRegistration = {
                ...regs.find(r => r.name === params.name),
                state: AspectRegistrationState.Disabled,
            };
            await ci.context.messageClient.send(aspectRegistration, addressEvent("AspectRegistration"));
            await ci.addressChannels(
                slackSuccessMessage(
                    "Disable Report",
                    `Successfully disabled report for aspect ${italic(aspectRegistration.displayName)}`),
            );
        }
    },
};

export const EnableAspectReportCommand: CommandHandlerRegistration = {
    name: "EnableAspectReport",
    description: "Enable an aspect report",
    intent: ["enable report"],
    autoSubmit: true,
    listener: async ci => {
        const regs = (await getAspectRegistrations(ci.context) || []).filter(a => a.state === AspectRegistrationState.Disabled);
        if (regs.length === 0) {
            return ci.addressChannels(
                slackInfoMessage(
                    "Enable Report",
                    "This workspace currently doesn't have any aspects reports to enable"));
        }
        const params = await ci.promptFor<{ name: string }>(
            {
                name: {
                    description: "Select aspect report to enable",
                    type: {
                        options: regs.map(r => ({ value: r.name, description: `${r.displayName} - ${r.owner}` })),
                        kind: "single",
                    },
                },
            },
        );

        if (!!params && !!params.name) {
            const aspectRegistration: AspectRegistrations.AspectRegistration = {
                ...regs.find(r => r.name === params.name),
                state: AspectRegistrationState.Enabled,
            };
            await ci.context.messageClient.send(aspectRegistration, addressEvent("AspectRegistration"));
            await ci.addressChannels(
                slackSuccessMessage(
                    "Enable Report",
                    `Successfully enabled report for aspect ${italic(aspectRegistration.displayName)}`),
            );
        }
    },
};

export const UpdateAspectCommand: CommandHandlerRegistration<{ owner: string, name: string, displayName: string, shortName?: string, unit?: string, description: string, category: string, report: string, state: string }> = {
    name: "UpdateAspect",
    description: "Register a new aspect",
    parameters: {
        owner: { description: "Name of SDM that owns this aspect", required: true},
        name: { description: "Aspect name (often referred to as type", required: true},
        displayName: { description: "Aspect display name using in PR bodies and on the web-app", required: false},
        description: { description: "Description of the aspect on the web-app", required: false },
        category: { description: "Category of the aspect (shows up as tab on the web-app)", required: false},
        shortName: { description: "Short name of the aspect (used in search boxes etc)", required: false },
        unit: { description: "Unit of the aspect (version, tags etc)", required: false },
        report: { description: "Report type", required: true },
        state: { description: "Enable or Disable", required: false},
    },
    listener: async ci => {

        const regs = await getAspectRegistrations(ci.context, ci.parameters.name);

        // Store registration
        const aspectRegistration: AspectRegistrations.AspectRegistration = {
            ... regs[0],
            ...ci.parameters as any,
            url: ci.parameters.report === "drift" ? `drift?type=${ci.parameters.name}&band=true&repos=true` :
                (ci.parameters.report === "morg" ? `fingerprint/${ci.parameters.name}/*?byOrg=true&trim=false` :
                    `fingerprint/${ci.parameters.name}/${ci.parameters.name}?byOrg=true&trim=false`),
        };

        delete aspectRegistration.owner;
        delete aspectRegistration.name;

        await ci.context.messageClient.send(aspectRegistration, addressEvent("AspectRegistration"));
    },
};
