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
import { LanguageAspect } from "../../../lib/aspect/common/languageAspect";

describe("languageAspect", () => {

    describe("c++ aspect", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await LanguageAspect.extract(p, undefined) as FP<ClassificationData>;
            return assert.deepStrictEqual(fp.data.tags, []);
        });

        it("finds cpp file in a subdirectory", async () => {
            const p = InMemoryProject.of({
                path: "anydir/myfile.cpp", content: "something",
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["c++"]);
        });
        it("finds hpp file in root directory", async () => {
            const p = InMemoryProject.of({
                path: "myfile.hpp", content: "something",
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["c++"]);
        });
        it("finds cxx file in nested directory", async () => {
            const p = InMemoryProject.of({
                path: "anydir/subdir/myfile.cxx", content: "something",
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["c++"]);
        });
        it("doesn't tag files with no extension", async () => {
            const p = InMemoryProject.of({
                path: "anydir/subdir/myfile", content: "something",
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, []);
        });

    });

});

async function doExtract(p: Project): Promise<FP<ClassificationData>> {
    return LanguageAspect.extract(p, undefined) as any;
}
