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
import { UpdateTargetFingerprintName } from "@atomist/sdm-pack-fingerprint/lib/handlers/commands/updateTarget";
import { getAspectRegistrations } from "../aspect/aspectsFactory";

interface SetTargetParameters {
    sha: string;
    type: string;
    name: string;
}

export function setTargetCommand(sdm: SoftwareDeliveryMachine,
                                 aspects: Aspect[]): CommandHandlerRegistration<SetTargetParameters> {
    return {
        name: "SetTarget",
        description: "Broadcast a set new target job",
        parameters: {
            sha: {},
            type: {},
            name: {},
        },
        listener: async ci => {

            const owner = await getAspectOwner(sdm, ci.context, aspects, ci.parameters.type);

            await createJob({
                registration: owner,
                command: UpdateTargetFingerprintName,
                parameters: [{
                    broadcast: false,
                    sha: ci.parameters.sha,
                    targetfingerprint: toName(ci.parameters.type, ci.parameters.name),
                }],
            }, ci.context);
        },
    };
}

export async function getAspectOwner(sdm: SoftwareDeliveryMachine,
                                     ctx: HandlerContext,
                                     aspects: Aspect[],
                                     type: string): Promise<string> {
    const regs = await getAspectRegistrations(ctx, type);
    let owner;
    if (!!regs && regs.length === 1) {
        const reg = regs[0];
        if (!!reg.owner) {
            owner = reg.owner;
        }
    } else if (aspects.some(a => a.name === type)) {
        owner = sdm.configuration.name;
    }

    if (!owner) {
        throw new Error(`No owner for aspect ${type} available`);
    }

    return owner;
}
