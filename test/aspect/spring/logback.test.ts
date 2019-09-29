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

import {
    InMemoryProject,
    Project,
} from "@atomist/automation-client";
import { FP } from "@atomist/sdm-pack-fingerprint";

import * as assert from "assert";
import {
    LogbackAspect, LogbackConfigFile,
} from "../../../lib/aspect/spring/logbackAspect";
import { GlobAspectData } from "@atomist/sdm-pack-aspect";

export const LogbackWithConsole = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>

    <property name="LOGS" value="./logs" />

    <appender name="Console"
        class="ch.qos.logback.core.ConsoleAppender">
        <layout class="ch.qos.logback.classic.PatternLayout">
            <Pattern>
                %black(%d{ISO8601}) %highlight(%-5level) [%blue(%t)] %yellow(%C{1.}): %msg%n%throwable
            </Pattern>
        </layout>
    </appender>

    <!-- LOG everything at INFO level -->
    <root level="info">
        <appender-ref ref="Console" />
    </root>

    <!-- LOG "com.baeldung*" at TRACE level -->
    <logger name="com.baeldung" level="trace" additivity="false">
        <appender-ref ref="Console" />
    </logger>

</configuration>`;

export const LogbackNoConsole = `
<?xml version="1.0" encoding="UTF-8"?>
<configuration>

    <property name="LOGS" value="./logs" />

    <appender name="RollingFile"
        class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>spring-boot-logger.log</file>
        <encoder
            class="ch.qos.logback.classic.encoder.PatternLayoutEncoder">
            <Pattern>%d %p %C{1.} [%t] %m%n</Pattern>
        </encoder>


    </appender>

    <!-- LOG everything at INFO level -->
    <root level="info">
        <appender-ref ref="RollingFile" />
    </root>

    <!-- LOG "com.baeldung*" at TRACE level -->
    <logger name="com.baeldung" level="trace" additivity="false">
        <appender-ref ref="RollingFile" />
    </logger>

</configuration>
`;

describe("Logback aspect", () => {

    describe("extraction", () => {

        it("should not find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await doExtractLogback(p);
            assert.deepStrictEqual(fp.data.matches, []);
        });

        it("should find logback-spring", async () => {
            const p = InMemoryProject.of({
                path: "src/main/resources/logback-spring.xml",
                content: LogbackWithConsole,
            });
            const fp = await doExtractLogback(p);
            assert.strictEqual(fp.data.matches.length, 1);
            assert.deepStrictEqual(fp.data.matches[0].appenders,
                [
                    { name: "Console", appenderClass: "ch.qos.logback.core.ConsoleAppender" },
                ]);
            assert.deepStrictEqual(fp.data.matches[0].loggers,
                [
                    { name: "root", appenderNames: ["Console"] },
                    { name: "com.baeldung", appenderNames: ["Console"] },
                ]);
        });
    });

});

export async function doExtractLogback(p: Project): Promise<FP<GlobAspectData<LogbackConfigFile>>> {
    return LogbackAspect.extract(p, undefined) as any;
}
