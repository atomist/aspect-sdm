import {
    CommandHandlerRegistration,
    createJob,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { Aspect } from "@atomist/sdm-pack-fingerprint";
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
                    type: ci.parameters.type,
                    name: ci.parameters.name,
                    title: ci.parameters.title,
                    body: ci.parameters.body,
                    branch: ci.parameters.branch,
                }],
            }, ci.context);
        },
    };
}
