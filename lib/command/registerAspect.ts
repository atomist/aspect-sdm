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
    slackSuccessMessage,
} from "@atomist/sdm";
import {
    codeBlock,
    italic,
} from "@atomist/slack-messages";
import { AspectRegistrations } from "../typings/types";

export const RegisterAspectCommand: CommandHandlerRegistration<{ name: string, displayName: string, shortName?: string, unit?: string, description: string, endpoint: string, category: string }> = {
    name: "RegisterAspect",
    description: "Register and deploy a new aspect",
    intent: "register aspect",
    parameters: {
        name: {},
        displayName: {},
        description: {},
        category: {},
        shortName: { required: false },
        unit: { required: false },
        endpoint: {},
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

        const aspectRegistration: AspectRegistrations.AspectRegistration = {
            ...ci.parameters,
            url: report === "drift" ? `drift?type=${ci.parameters.name}&band=true&repos=true` : `fingerprint/${ci.parameters.name}/*?byOrg=true`,
        };

        await ci.context.messageClient.send(aspectRegistration, addressEvent("AspectRegistration"));
        await ci.addressChannels(
            slackSuccessMessage(
                "Aspect Registration",
                `Successfully registered aspect ${italic(aspectRegistration.displayName)}:\n\n${codeBlock(JSON.stringify(aspectRegistration, undefined, 2))}`),
        );
    },
};
