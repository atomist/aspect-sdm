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
import { getAspectOwner } from "./setTarget";

interface UnsetTargetParameters {
    type: string;
    name: string;
}

export function unsetTargetCommand(sdm: SoftwareDeliveryMachine,
                                   aspects: Aspect[]): CommandHandlerRegistration<UnsetTargetParameters> {
    return {
        name: "UnsetTarget",
        description: "Broadcast a unset target job",
        parameters: {
            type: {},
            name: {},
        },
        listener: async ci => {

            const owner = await getAspectOwner(sdm, ci.context, aspects, ci.parameters.type);

            await createJob({
                registration: owner,
                command: "DeleteTargetFingerprint",
                parameters: [{
                    msgId: undefined,
                    type: ci.parameters.type,
                    name: ci.parameters.name,
                }],
            }, ci.context);
        },
    };
}
