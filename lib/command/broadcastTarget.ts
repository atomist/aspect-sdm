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
    CommandHandlerRegistration,
    createJob,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { Aspect } from "@atomist/sdm-pack-fingerprint";
import { toName } from "@atomist/sdm-pack-fingerprint/lib/adhoc/preferences";
import { getAspectOwner } from "./setTarget";

interface BroadcastTargetParameters {
    type: string;
    name: string;
    title?: string;
    body?: string;
    branch?: string;
}

export function broadcastTargetCommand(sdm: SoftwareDeliveryMachine,
                                       aspects: Aspect[]): CommandHandlerRegistration<BroadcastTargetParameters> {
    return {
        name: "BroadcastTarget",
        description: "Broadcast a broadcast target job",
        parameters: {
            type: {},
            name: {},
            title: { required: false },
            body: { required: false },
            branch: { required: false },
        },
        listener: async ci => {

            const owner = await getAspectOwner(sdm, ci.context, aspects, ci.parameters.type);

            await createJob({
                registration: owner,
                command: "BroadcastFingerprintMandate",
                parameters: [{
                    fingerprint: toName(ci.parameters.type, ci.parameters.name),
                    title: ci.parameters.title,
                    body: ci.parameters.body,
                    branch: ci.parameters.branch,
                }],
            }, ci.context);
        },
    };
}
