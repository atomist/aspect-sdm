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
    GitCommandGitProject,
    GitHubRepoRef,
    InMemoryProject,
    Project,
} from "@atomist/automation-client";
import { MavenBuildPlugins } from "../../../lib/aspect/maven/mavenPlugins";
import { ZipkinPom } from "./zipkinPom";

describe("maven plugins", () => {

    it("should parse zipkin", async () => {
        const project = InMemoryProject.of(
            { path: "pom.xml", content: ZipkinPom },
        );
        const extracted = await MavenBuildPlugins.extract(project, undefined);
        console.log(JSON.stringify(extracted));
    }).timeout(200000);

});

async function loadProject(): Promise<Project> {
    return GitCommandGitProject.cloned(undefined, new GitHubRepoRef(
        "xylocarp-whelky", "zipkin"));
}
