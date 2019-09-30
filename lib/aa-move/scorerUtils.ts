import { RepositoryScorer } from "@atomist/sdm-pack-aspect";
import { VersionedArtifact } from "@atomist/sdm-pack-spring";
import { isMavenDependencyFingerprint } from "../aspect/maven/mavenDirectDependencies";
import { FP } from "@atomist/sdm-pack-fingerprint";

export function rewardForMavenDependency(opts: { name: string, reason: string, test: (va: VersionedArtifact) => boolean }): RepositoryScorer {
    return rewardForFingerprint({
        name: opts.name,
        reason: opts.reason,
        test: fp => isMavenDependencyFingerprint(fp) && opts.test(fp.data)
    })
}

export function rewardForFingerprint(opts: { name: string, reason: string, test: (fp: FP) => boolean }): RepositoryScorer {
    return {
        name: opts.name,
        scoreFingerprints: async rts => {
            const found = rts.analysis.fingerprints
                .find(opts.test);
            return found ? {
                reason: opts.reason,
                score: 5,
            } : undefined;
        }
    }
}