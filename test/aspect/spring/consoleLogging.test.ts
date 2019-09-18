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
    GitProject,
    InMemoryProject,
} from "@atomist/automation-client";

import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import { FP } from "@atomist/sdm-pack-fingerprint";
import { HasSpringBootPom } from "@atomist/sdm-pack-spring";
import * as assert from "assert";
import { ConsoleLogging } from "../../../lib/aspect/spring/consoleLogging";
import { SpringBootVersion } from "../../../lib/aspect/spring/springBootVersion";
import {
    doExtractLogback,
    LogbackNoConsole,
    LogbackWithConsole,
} from "./logback.test";
import { GishProject } from "./springProjects";

describe("Console logging aspect", () => {

    it("should find console logging in spring-boot without logback, providing fingerprint", async () => {
        const p = GishProject();
        const sfp = await SpringBootVersion.extract(p, undefined) as any as FP;
        const lfp = await doExtractLogback(p);
        const consolidated = toArray(await ConsoleLogging.consolidate([sfp, lfp], undefined, undefined));
        assert.strictEqual(consolidated.length, 1);
        assert(consolidated[0].data.present);
    });

    it("should find console in logback-spring", async () => {
        const p = InMemoryProject.of({
            path: "src/main/resources/logback-spring.xml",
            content: LogbackWithConsole,
        });
        const fp = await doExtractLogback(p);
        const consolidated = toArray(await ConsoleLogging.consolidate([fp], undefined, undefined));
        assert.strictEqual(consolidated.length, 1);
        assert(consolidated[0].data.present);
    });

    it("should find no console in logback-spring", async () => {
        const p = InMemoryProject.of({
            path: "src/main/resources/logback-spring.xml",
            content: LogbackNoConsole,
        });
        const fp = await doExtractLogback(p);
        const consolidated = toArray(await ConsoleLogging.consolidate([fp], undefined, undefined));
        assert.strictEqual(consolidated.length, 1);
        assert.strictEqual(consolidated[0].data.present, false);
    });

});
