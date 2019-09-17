import { Aspect, fingerprintOf } from "@atomist/sdm-pack-fingerprint";

export interface LogbackConfigFile {
    path: string;
    content: string;
}

export interface LogbackData {
    configFiles: LogbackConfigFile[];
}

export const LogbackType = "logback";

export const LogbackAspect: Aspect<LogbackData> = {
    name: LogbackType,
    displayName: "Logback",
    extract: async p => {
        const data: LogbackData = { configFiles: [] };
        return fingerprintOf({
            type: LogbackType,
            data,
        });
    },
};