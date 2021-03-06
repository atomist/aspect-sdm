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
import * as assert from "power-assert";
import { GradleBuildFiles } from "../../../lib/aspect/gradle/gradleBuildFile";

describe("Gradle build files", () => {
    it("should find Gradle build files in a project", async () => {
        const p = InMemoryProject.of(
        { path: "build.gradle", content: "" },
            { path: "main/build.gradle", content: ""},
        );
        const fp = toArray(await GradleBuildFiles.extract(p, undefined));
        assert.strictEqual(fp.length, 1);
        assert.strictEqual(fp[0].data.matches.length, 2);
        assert(fp[0].data.matches.find(m => m.path === "build.gradle"));
        assert(fp[0].data.matches.find(m => m.path === "main/build.gradle"));
    });
});
