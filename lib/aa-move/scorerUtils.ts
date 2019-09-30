import { FiveStar, RepositoryScorer, RepoToScore } from "@atomist/sdm-pack-aspect";
import { FP } from "@atomist/sdm-pack-fingerprint";

/**
 * Emit the given score only when the condition is met.
 * Enables existing scorers to be reused in different context.
 */
export function makeConditional(scorer: RepositoryScorer,
                                test: (rts: RepoToScore) => boolean): RepositoryScorer {
    return {
        ...scorer,
        scoreFingerprints: async rts => {
            return test(rts) ?
                scorer.scoreFingerprints(rts) :
                undefined;
        },
    };
}

/**
 * Score with the given score when the fingerprint is present
 */
export function scoreOnFingerprintPresence(opts: {
    name: string,
    scoreWhenPresent?: FiveStar,
    scoreWhenAbsent?: FiveStar,
    reason: string,
    test: (fp: FP) => boolean
}): RepositoryScorer {
    return {
        name: opts.name,
        scoreFingerprints: async rts => {
            const found = rts.analysis.fingerprints
                .find(opts.test);
            if (found && opts.scoreWhenPresent) {
                return {
                    reason: opts.reason + " - present",
                    score: opts.scoreWhenPresent,
                };
            } else if (opts.scoreWhenAbsent) {
                return {
                    reason: opts.reason + " - absent",
                    score: opts.scoreWhenAbsent,
                };
            }
            return undefined;
        }
    }
}