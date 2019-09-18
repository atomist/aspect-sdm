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
import {
    ClassificationAspect,
    ClassificationData,
} from "@atomist/sdm-pack-aspect";
import { FP } from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import { CiAspect } from "../../../lib/aspect/common/ciAspect";

describe("ciAspect", () => {

    describe("CiAspect", () => {

        async function doExtract(p: Project): Promise<FP<ClassificationData>> {
            return CiAspect.extract(p, undefined) as any;
        }

        it("should not find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await doExtract(p);
            assert.deepStrictEqual(fp.data.tags, []);
        });

        it("finds a Concourse pipeline", async () => {
            for (const f of ["pipeline.yml", "ci/pipeline.yml"]) {
                const p = InMemoryProject.of({ path: f, content: "something" });
                const fp = await doExtract(p);
                assert.deepStrictEqual(fp.data.tags, ["concourse"]);
            }
        });

        it("finds a GitHub action workflow", async () => {
            for (const f of [".github/workflows/mine.yml", ".github/workflows/yours.yaml"]) {
                const p = InMemoryProject.of({ path: f, content: "something" });
                const fp = await doExtract(p);
                assert.deepStrictEqual(fp.data.tags, ["github-actions"]);
            }
        });

        it("finds multiple CI", async () => {
            const p = InMemoryProject.of(
                { path: ".travis.yml", content: "something" },
                { path: "Jenkinsfile", content: "something" },
            );
            const fp = await doExtract(p);
            assert(fp.data.tags.length === 2);
            assert(fp.data.tags.includes("travis"));
            assert(fp.data.tags.includes("jenkins"));
        });

    });

});
