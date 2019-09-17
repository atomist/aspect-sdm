import { Aspect, fingerprintOf, FP } from "@atomist/sdm-pack-fingerprint";
import { gatherFromFiles } from "@atomist/automation-client/lib/project/util/projectUtils";
import { logger, ProjectFile } from "@atomist/automation-client";
import { XmldocFileParser } from "@atomist/sdm-pack-spring/lib/xml/XmldocFileParser";
import { evaluateExpression, isSuccessResult } from "@atomist/tree-path";

export interface LogbackConfigFile {
    path: string;
    content: string;

    appenders: Array<{
        name: string,
        appenderClass: string,
    }>;
    loggers: Array<{
        name: string,
        appenderNames: string[];
    }>;
}

export interface LogbackData {
    configFiles: LogbackConfigFile[];
}

export const LogbackType = "logback";

export function isLogbackFingerprint(fp: FP): fp is FP<LogbackData> {
    const maybe = fp.data as LogbackData;
    return !!maybe && !!maybe.configFiles;
}

export const LogbackAspect: Aspect<LogbackData> = {
    name: LogbackType,
    displayName: "Logback",
    extract: async p => {
        const configFiles = await gatherFromFiles(p, "**/logback-spring.xml", parseLogbackXml);
        const data: LogbackData = { configFiles };
        return fingerprintOf({
            type: LogbackType,
            data,
        });
    },
};

async function parseLogbackXml(f: ProjectFile): Promise<LogbackConfigFile> {
    const parsed = await new XmldocFileParser().toAst(f);
    const appenderEval = evaluateExpression(parsed, "//configuration/appender");
    if (!isSuccessResult(appenderEval)) {
        logger.warn("Unable to parse XML file at %s", f.path);
        return undefined;
    }
    const appenders = appenderEval.map(app => ({
        name: (app as any).name,
        appenderClass: (app as any).class,
    }));
    const loggerEval = evaluateExpression(parsed, "//configuration/root | //configuration/logger");
    if (!isSuccessResult(loggerEval)) {
        logger.warn("Unable to parse XML file at %s", f.path);
        return undefined;
    }
    const loggers = loggerEval.map(app => ({
        name: (app as any).name || "root",
        appenderNames: app.$children.filter(c => c.$name === "appender-ref").map(c => (c as any).ref),
    }));
    return {
        path: f.path,
        content: await f.getContent(),
        appenders,
        loggers,
    };
}