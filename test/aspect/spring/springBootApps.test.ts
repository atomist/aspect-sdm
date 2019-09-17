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

import { InMemoryProject, Project } from "@atomist/automation-client";
import { FP } from "@atomist/sdm-pack-fingerprint";
import {
    SpringBootAppClass,
    SpringBootAppData,
} from "../../../lib/aspect/spring/springBootApps";

import * as assert from "assert";
import { GishProject } from "./springProjects";

describe("XML bean definitions", () => {

    it("should not find in empty project", async () => {
        const p = InMemoryProject.of();
        const fp = await doExtract(p);
        assert.deepStrictEqual(fp, undefined);
    });

    it("should find with single application Java class", async () => {
        const p = GishProject();
        const fp = await doExtract(p);
        assert.deepStrictEqual(fp.data.applicationClassName, "GishApplication");
        assert.deepStrictEqual(fp.data.applicationClassPackage, "com.smashing.pumpkins");
        assert.deepStrictEqual(fp.data.multipleDeclarations, false);
        assert.deepStrictEqual(fp.displayValue,  "com.smashing.pumpkins.GishApplication");
    });

});

async function doExtract(p: Project): Promise<FP<SpringBootAppData>> {
    return SpringBootAppClass.extract(p, undefined) as any;
}
