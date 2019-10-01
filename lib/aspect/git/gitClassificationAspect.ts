import {
    ClassificationAspect, daysSince,
    GitRecencyData,
    GitRecencyType,
    projectClassificationAspect
} from "@atomist/sdm-pack-aspect";
import { isBranchCountFingerprint } from "./branchCount";
import { FP } from "@atomist/sdm-pack-fingerprint";

export function gitClassificationAspect(opts: {
    deadDays: number,
    maxBranches: number
}): ClassificationAspect {
    return projectClassificationAspect({
            name: "git",
            displayName: undefined,
        },
        {
            tags: "dead",
            reason: `No commits for ${opts.deadDays} days`,
            testFingerprints: async fps => {
                // TODO this will come from type guard
                const grfp = fps.find(fp => fp.type === GitRecencyType) as FP<GitRecencyData>;
                if (!grfp) {
                    return false;
                }
                return daysSince(new Date(grfp.data.lastCommitTime)) > opts.deadDays;
            },
        },
        {
            tags: `>${opts.maxBranches}-branches`,
            reason: `More than ${opts.maxBranches} branches`,
            testFingerprints: async fps =>
                fps.some(fp => isBranchCountFingerprint(fp) && fp.data.count > opts.maxBranches)
        });
}