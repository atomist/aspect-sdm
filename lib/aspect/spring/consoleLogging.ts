/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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