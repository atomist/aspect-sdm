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

import { InMemoryProject } from "@atomist/automation-client";

import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import {
    fingerprintOf,
    FP,
} from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import {
    ConsoleLogging,
    ConsoleLoggingClassification,
} from "../../../lib/aspect/spring/consoleLogging";
import { SpringBootVersion } from "../../../lib/aspect/spring/springBootVersion";
import {
    doExtractLogback,
    LogbackNoConsole,
    LogbackWithConsole,
} from "./logback.test";
import { GishProject } from "./springProjects";

describe("Console logging aspect", () => {

    describe("consolidation", () => {
        it("should find console logging in spring-boot without logback, not providing fingerprint", async () => {
            const p = GishProject();
            const sfp = await SpringBootVersion.extract(p, undefined) as any as FP[];
            const lfp = await doExtractLogback(p);
            const consolidated = toArray(await ConsoleLogging.consolidate([...sfp, lfp], undefined, undefined));
            assert.strictEqual(consolidated.length, 0);
        });

        it("should find console in logback-spring", async () => {
            const sfp = await SpringBootVersion.extract( GishProject(), undefined) as any as FP[];
            const p = InMemoryProject.of({
                path: "src/main/resources/logback-spring.xml",
                content: LogbackWithConsole,
            });
            const fp = await doExtractLogback(p);
            const consolidated = toArray(await ConsoleLogging.consolidate([...toArray(sfp), fp], undefined, undefined));
            assert.strictEqual(consolidated.length, 1);
            assert.deepStrictEqual(consolidated[0].data.present, true);
        });

        it("should find no console in logback-spring", async () => {
            const sfp = await SpringBootVersion.extract( GishProject(), undefined) as any as FP[];
            const p = InMemoryProject.of({
                path: "src/main/resources/logback-spring.xml",
                content: LogbackNoConsole,
            });
            const fp = await doExtractLogback(p);
            const consolidated = toArray(await ConsoleLogging.consolidate([...toArray(sfp), fp], undefined, undefined));
            assert.strictEqual(consolidated.length, 1);
            assert.deepStrictEqual(consolidated[0].data.present, false);
        });
    });

    describe("tagging", () => {
        it("should tag on console logging presence", async () => {
            const fp = fingerprintOf({
                type: "console-logging",
                data: {
                    present: true,
                },
            });
            const consolidated = toArray(await ConsoleLoggingClassification.consolidate([fp], undefined, undefined));
            assert.strictEqual(consolidated.length, 1);
            assert.deepStrictEqual(consolidated[0].name, "console-logging");
        });

        it("should not tag on no console logging presence", async () => {
            const fp = fingerprintOf({
                type: "console-logging",
                data: {
                    present: false,
                },
            });
            const consolidated = toArray(await ConsoleLoggingClassification.consolidate([fp], undefined, undefined));
            assert.strictEqual(consolidated.length, 0);
        });
    });
});
