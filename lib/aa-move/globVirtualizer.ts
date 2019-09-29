import { distinctNonRootPaths, GlobAspectData, isGlobMatchFingerprint } from "@atomist/sdm-pack-aspect";
import { Aspect, FP } from "@atomist/sdm-pack-fingerprint";

/**
 * Virtualize all globs
 */
export const GlobVirtualizer: Aspect<GlobAspectData> = {
    name: "globSprayer",
    displayName: undefined,
    extract: async () => [],
    consolidate: async fingerprints => {
        const emitted: Array<FP<GlobAspectData>> = [];
        const projectPaths = distinctNonRootPaths(fingerprints);
        const globFingerprints = fingerprints.filter(isGlobMatchFingerprint);
        for (const path of projectPaths) {
            for (const gf of globFingerprints) {
                const data = {
                    ...gf.data,
                    matches: gf.data.matches.filter(m => m.path.startsWith(path)),
                };
                emitted.push({
                    ...gf,
                    data,
                    path,
                })
            }
        }
        return emitted;
    }
};