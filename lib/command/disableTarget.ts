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
