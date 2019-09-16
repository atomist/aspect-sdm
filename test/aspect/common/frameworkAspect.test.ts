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
import { ClassificationData } from "@atomist/sdm-pack-aspect";
import { FP } from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import { FrameworkAspect } from "../../../lib/aspect/common/frameworkAspect";
import { NonSpringPom, springBootPom } from "./testPoms";

describe("frameworkAspect", () => {

    describe("node", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await doExtract(p);
            return assert.strictEqual(fp.data.tags.length, 0);
        });

        it("finds node from package.json", async () => {
            const p = InMemoryProject.of({
                path: "package.json", content: "something",
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["node"]);
        });

    });

    describe("spring boot", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await doExtract(p);
            return assert.strictEqual(fp.data.tags.length, 0);
        });

        it("doesn't find in non spring project", async () => {
            const p = InMemoryProject.of({
                path: "pom.xml", content: NonSpringPom,
            });
            const fp = await doExtract(p);
            return assert.strictEqual(fp.data.tags.length, 0);
        });

        it("finds spring boot from pom", async () => {
            const p = InMemoryProject.of({
                path: "pom.xml", content: springBootPom(),
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["spring-boot"]);
        });

    });

});

async function doExtract(p: Project): Promise<FP<ClassificationData>> {
    return FrameworkAspect.extract(p, undefined) as any;
}
