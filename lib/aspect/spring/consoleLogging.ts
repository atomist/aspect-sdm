import { Aspect, fingerprintOf } from "@atomist/sdm-pack-fingerprint";
import { isLogbackFingerprint, LogbackConfigFile } from "./logbackAspect";
import { SpringBootVersion } from "./springBootVersion";

export interface ConsoleLoggingData {
    present: boolean;
}

export const ConsoleLoggingType = "console-logging";

export const ConsoleLogging: Aspect<ConsoleLoggingData> = {
    name: ConsoleLoggingType,
    displayName: "Console logging status",
    extract: async () => [],
    consolidate: async fps => {
        const logbackFingerprint = fps.find(isLogbackFingerprint);
        const hasLogbackWithConsole = !!logbackFingerprint && logbackFingerprint.data.configFiles.some(logsToConsole);
        const isSpringBoot = fps.some(fp => fp.type === SpringBootVersion.name);
        const present = hasLogbackWithConsole || (isSpringBoot && !logbackFingerprint);
        return fingerprintOf({
            type: ConsoleLoggingType,
            data: { present },
        })
    },
};

function logsToConsole(lbcf: LogbackConfigFile): boolean {
    const consoleAppender = lbcf.appenders.find(app => app.appenderClass === "ch.qos.logback.core.ConsoleAppender");
    if (!consoleAppender) {
        return false;
    }
    // Now we need to see this baby is used
    return lbcf.loggers.some(lgr => lgr.appenderNames.includes(consoleAppender.name));
}