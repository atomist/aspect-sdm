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
import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import {
    ClassificationAspect,
    ClassificationData,
} from "@atomist/sdm-pack-aspect";
import { FP } from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import { CiAspect } from "../../../lib/aspect/common/ciAspect";

describe("ciAspect", () => {

    describe("gitlab action tests", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await CiAspect.extract(p, undefined) as FP<ClassificationData>;
            return assert.strictEqual(fp, undefined);
        });

        it("finds an action workflow", async () => {
            const p = InMemoryProject.of({
                path: ".github/workflows/mine.yml", content: "something",
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["github-actions"]);
        });

    });

});

async function doExtract(p: Project): Promise<FP<ClassificationData>> {
    return CiAspect.extract(p, undefined) as any;
}
