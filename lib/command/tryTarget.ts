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
                    sha: ci.parameters.sha,
                    targetfingerprint: toName(ci.parameters.type, ci.parameters.name),
                    targets: {
                        owner: ci.parameters.owner,
                        repo: ci.parameters.repo,
                        branch: ci.parameters.branch,
                        apiUrl: ci.parameters.apiUrl,
                    },
                    job: {
                        title: ci.parameters.title,
                        description: ci.parameters.description,
                    },
                }],
                concurrentTasks: 1,
            }, ci.context);
        },
    };
}
