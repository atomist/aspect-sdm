import {
    globAspect,
    GlobAspectData,
} from "@atomist/sdm-pack-aspect";
import {
    Aspect,
    FP,
} from "@atomist/sdm-pack-fingerprint";

export function isGradleBuildFilesFingerprint(fp: FP): fp is FP<GlobAspectData> {
    return fp.type === GradleBuildFilesType;
}

export const GradleBuildFilesType = "GradleBuildFiles";
export const GradleBuildFiles: Aspect<GlobAspectData> = globAspect({
    name: GradleBuildFilesType,
    displayName: "Gradle build files",
    glob: "**/build{*.gradle,*.gradle.kts}",
});
