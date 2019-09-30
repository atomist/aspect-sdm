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
    NodeFsLocalProject,
    ScmProviderType,
    SimpleRepoId,
} from "@atomist/automation-client";
import { FP } from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import {
    BranchCountData,
    extractBranchCount,
} from "../../../lib/aspect/git/branchCount";
import * as ghApi from "../../../lib/util/gitHubApi";

describe("aspect/git/branchCount", () => {

    describe("extractBranchCount", () => {

        let origApi: any;
        before(() => {
            origApi = Object.getOwnPropertyDescriptor(ghApi, "api");
            Object.defineProperty(ghApi, "api", {
                value: () => {
                    return {
                        paginate: async () => [
                            {
                                name: "gh-pages",
                                commit: {
                                    sha: "af20d3aeeacacb581bb792cab0ad1bfb5f1155ff",
                                    url: "https://api.github.com/repos/atomist/aspect-sdm/commits/af20d3aeeacacb581bb792cab0ad1bfb5f1155ff",
                                },
                                protected: false,
                            },
                            {
                                name: "master",
                                commit: {
                                    sha: "33702debc5e9a577d73c3c7a8dd62fd308b84c15",
                                    url: "https://api.github.com/repos/atomist/aspect-sdm/commits/33702debc5e9a577d73c3c7a8dd62fd308b84c15",
                                },
                                protected: false,
                            },
                            {
                                name: "spring",
                                commit: {
                                    sha: "22ebc1e3a3e8599e5228575e2f2c5a7374cd6bf7",
                                    url: "https://api.github.com/repos/atomist/aspect-sdm/commits/22ebc1e3a3e8599e5228575e2f2c5a7374cd6bf7",
                                },
                                protected: false,
                            },
                        ],
                    };
                },
            });
        });
        after(() => {
            Object.defineProperty(ghApi, "api", origApi);
        });

        it("should return undefined for in-memory project", async () => {
            const p = InMemoryProject.of();
            const fp = await extractBranchCount(p, {} as any);
            assert(fp === undefined);
        });

        it("should return branch count for GitHub project", async () => {
            const p = InMemoryProject.of();
            p.id.owner = "atomist";
            p.id.repo = "aspect-sdm";
            (p.id as any).setUserConfig = async () => ({ target: p, success: true });
            (p.id as any).providerType = ScmProviderType.github_com;
            const pili: any = {
                credentials: {
                    token: "not-an-actual-github-personal-access-token",
                },
            };
            const fp = await extractBranchCount(p, pili);
            const e = {
                type: "branch-count",
                name: "branch-count",
                data: { count: 3 },
                sha: "0c07187ea6d064441225b3cba26a7b1e8bc702fcf332b457dae8e26892ba68a6",
            };
            assert.deepStrictEqual(fp, e);
        });

        it("should return branch count for local project", async () => {
            const p = await NodeFsLocalProject.fromExistingDirectory(new SimpleRepoId("local", "test"), ".");
            const pili: any = {};
            const fp = await extractBranchCount(p, pili) as FP<BranchCountData>;
            assert(fp);
            assert(fp.name === "branch-count");
            assert(fp.data.count > 0);
        }).timeout(5000);

    });

});
