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
    listener: async ci => {
        const regs = (await getAspectRegistrations(ci.context) || []).filter(a => a.state === AspectRegistrationState.Enabled);
        if (regs.length === 0) {
            return ci.addressChannels(
                slackInfoMessage(
                    "Disable Aspect",
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
                    "Aspect Registration",
                    `Successfully disabled report for aspect ${italic(aspectRegistration.displayName)}`),
            );
        }
    },
};

export const EnableAspectReportCommand: CommandHandlerRegistration = {
    name: "EnableAspectReport",
    description: "Enable an aspect report",
    intent: ["enable report"],
    listener: async ci => {
        const regs = (await getAspectRegistrations(ci.context) || []).filter(a => a.state === AspectRegistrationState.Disabled);
        if (regs.length === 0) {
            return ci.addressChannels(
                slackInfoMessage(
                    "Enable Aspect",
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
                    "Aspect Registration",
                    `Successfully enabled report for aspect ${italic(aspectRegistration.displayName)}`),
            );
        }
    },
};
