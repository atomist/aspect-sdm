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
import { GlobAspectData } from "@atomist/sdm-pack-aspect";
import { FP } from "@atomist/sdm-pack-fingerprint";
import { XmlBeanDefinitions } from "../../../lib/aspect/spring/xmlBeans";

import * as assert from "assert";

describe("XML bean definitions", () => {

    it("should not find in empty project", async () => {
        const p = InMemoryProject.of();
        const fp = await doExtract(p);
        assert.deepStrictEqual(fp.data.matches, []);
    });

    it("should not find with non-Spring XML", async () => {
        const p = InMemoryProject.of({
            path: "thing.xml",
            content: "<xml></xml>",
        });
        const fp = await doExtract(p);
        assert.deepStrictEqual(fp.data.matches, []);
    });

});

async function doExtract(p: Project): Promise<FP<GlobAspectData>> {
    return XmlBeanDefinitions.extract(p, undefined) as any;
}
