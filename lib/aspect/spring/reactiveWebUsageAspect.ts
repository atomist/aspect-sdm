import { globAspect, GlobAspectData } from "@atomist/sdm-pack-aspect";
import { JavaSourceFiles } from "@atomist/sdm-pack-spring/lib/java/javaProjectUtils";
import { FP } from "@atomist/sdm-pack-fingerprint";

const ReactiveWebUsageType = "reactive-web";

export function isReactiveWebUsageFingerprint(fp: FP): fp is FP<GlobAspectData> {
    return fp.type === ReactiveWebUsageType;
}

export const ReactiveWebUsageAspect = globAspect({
    name: ReactiveWebUsageType,
    displayName: undefined,
    // TODO Kotlin also
    glob: JavaSourceFiles,
    contentTest: content => content.includes("import org.springframework.web.reactive"),
});
