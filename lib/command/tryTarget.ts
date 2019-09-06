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

import { HandlerContext } from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    createJob,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { Aspect } from "@atomist/sdm-pack-fingerprint";
import { toName } from "@atomist/sdm-pack-fingerprint/lib/adhoc/preferences";
import { getAspectRegistrations } from "../aspect/aspectsFactory";
import { getAspectOwner } from "./setTarget";

interface TryTargetParameters {
    owner: string;
    repo: string;
    branch: string;
    apiUrl: string;

    sha: string;
    type: string;
    name: string;

    title: string;
    description: string;
}

export function tryTargetCommand(sdm: SoftwareDeliveryMachine,
                                 aspects: Aspect[]): CommandHandlerRegistration<TryTargetParameters> {
    return {
        name: "TryTarget",
        description: "Broadcast a try target job",
        parameters: {
            owner: {},
            repo: {},
            branch: {},
            apiUrl: {},

            sha: {},
            type: {},
            name: {},

            title: {},
            description: {},
        },
        listener: async ci => {

            const owner = await getAspectOwner(sdm, ci.context, aspects, ci.parameters.type);

            await createJob({
                registration: owner,
                command: "ApplyTargetFingerprintBySha",
                parameters: [{
                    "sha": ci.parameters.sha,
                    "targetfingerprint": toName(ci.parameters.type, ci.parameters.name),
                    "targets": {
                        owner: ci.parameters.owner,
                        repo: ci.parameters.repo,
                        branch: ci.parameters.branch,
                        apiUrl: ci.parameters.apiUrl,
                    },
                    "job.name": ci.parameters.title,
                    "job.description": ci.parameters.description,
                }],
            }, ci.context);
        },
    };
}
