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

import { GitCommandGitProject } from "@atomist/automation-client";
import * as assert from "assert";
import { VirtualProjectAspects } from "../../lib/aspect/aspects";

describe("VirtualProjectAspects", () => {

    it.skip("should not fail", async () => {
        const p = await GitCommandGitProject.fromExistingDirectory({
            owner: "sdm-org",
            repo: "engine-and-editor",
            branch: "master",
        } as any, "/Users/cdupuis/Desktop/engine-and-editor");
        const fps = await VirtualProjectAspects.extract(p, {} as any);
        assert.strictEqual(fps, undefined);
    });

});
