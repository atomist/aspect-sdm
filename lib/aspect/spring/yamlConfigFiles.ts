import { globAspect, GlobAspectData } from "@atomist/sdm-pack-aspect";
import { FP } from "@atomist/sdm-pack-fingerprint";

const YamlConfigFile = "yaml-config";

export function isYamlConfigFileFingerprint(fp: FP): fp is FP<GlobAspectData> {
    return fp.type === YamlConfigFile;
}

export const YamlConfigFiles = globAspect({
    name: YamlConfigFile,
    displayName: "Yaml config file",
    glob: "**/src/main/resources/application.yml",
});
