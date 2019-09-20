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
    ClassificationData,
} from "@atomist/sdm-pack-aspect";
import { FP } from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import { CiAspect } from "../../../lib/aspect/common/ciAspect";

describe("ciAspect", () => {

    describe("CiAspect", () => {

        async function doExtract(p: Project): Promise<Array<FP<ClassificationData>>> {
            return CiAspect.extract(p, undefined) as any;
        }

        it("should not find in empty project", async () => {
            const p = InMemoryProject.of();
            const fps = await doExtract(p);
            assert.deepStrictEqual(fps.length, 0);
        });

        it("finds a Concourse pipeline", async () => {
            for (const f of ["pipeline.yml", "ci/pipeline.yml"]) {
                const p = InMemoryProject.of({ path: f, content: "something" });
                const fps = await doExtract(p);
                return assert(fps.some(fp => fp.name === "concourse"));
            }
        });

        it("finds a GitHub action workflow", async () => {
            for (const f of [".github/workflows/mine.yml", ".github/workflows/yours.yaml"]) {
                const p = InMemoryProject.of({ path: f, content: "something" });
                const fps = await doExtract(p);
                return assert(fps.some(fp => fp.name === "github-actions"));
            }
        });

        it("finds multiple CI", async () => {
            const p = InMemoryProject.of(
                { path: ".travis.yml", content: "something" },
                { path: "Jenkinsfile", content: "something" },
            );
            const fps = await doExtract(p);
            assert(fps.length === 2);
            return assert(fps.some(fp => fp.name === "travis"));
            return assert(fps.some(fp => fp.name === "jenkins"));
        });

    });

});
