import { matchAspect } from "../../aa-move/matchAspect";
import { microgrammar } from "@atomist/microgrammar";
import { MicrogrammarBasedFileParser } from "@atomist/automation-client";
import { FP } from "@atomist/sdm-pack-fingerprint";
import { GlobAspectData } from "@atomist/sdm-pack-aspect";

export const JavaVersionType = "java-version";

export interface JavaVersionData {
    javaVersion: string;
}

const JavaVersionGrammar = microgrammar({
    _prefix: "<java.version>",
    javaVersion: /[a-zA-Z0-9.]+/,
    _suffix: "</java.version>",
});

export function isJavaVersionFingerprint(fp: FP): fp is FP<GlobAspectData<JavaVersionData>> {
    return fp.type === JavaVersionType;
}

export const JavaVersion = matchAspect<JavaVersionData>({
    name: JavaVersionType,
    displayName: "Java version",
    glob: "**/pom.xml",
    pathExpression: "//javaVersion",
    parseWith: new MicrogrammarBasedFileParser("pom", "version", JavaVersionGrammar),
    mapper: mr => {
        return { javaVersion: mr.$value };
    },
    toDisplayableFingerprint: fp => {
        return fp.data.matches.map(m => m.javaVersion).join(",")
    },
});

