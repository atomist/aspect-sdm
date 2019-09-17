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

import { InMemoryProject } from "@atomist/automation-client";
import { FP } from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import { InfrastructureAspect } from "../../../lib/aspect/common/infrastructureAspect";

describe("the infrastructure aspect", () => {
    it("finds all the tags", async () => {
        const p = InMemoryProject.of({
            path: ".travis.yml", content: "",
        }, {
            path: "anywhere/something.tf", content: "",
        }, {
            path: "anywhere/docker-compose.yml", content: "",
        }, {
            path: "anywhere/Dockerfile", content: "",
        }, {
            path: "anywhere/manifest.yml", content: "",
        }, {
            path: "anywhere/app.yml", content: "",
        }, {
            path: "anywhere/.openshift/stuff", content: "",
        }, {
            path: "README.md", content: `We deploy to Heroku!
            git push --force heroku master
            # etc etc`,
        }, {
            path: "bin/deploy", content: "ansible-playbook etc etc etc",
        });
        const result = await InfrastructureAspect.extract(p, undefined) as FP;
        assert.deepStrictEqual(result.data.tags.sort(), ["ansible",
            "cloudfoundry",
            "docker",
            "docker-compose",
            "google-app-engine",
            "heroku",
            "openshift",
            "terraform"]);
    });

    it("recognizes both spellings of yaml", async () => {

        const p = InMemoryProject.of({
            path: "anywhere/app.yaml", content: "",
        });
        const result = await InfrastructureAspect.extract(p, undefined) as FP;
        assert(result);
        assert.deepStrictEqual(result.data.tags.sort(), [
            "google-app-engine",
        ]);
    });

    it("recognizes three kinds of app.json/yml/yaml", async () => {

        const p = InMemoryProject.of({
            path: "anywhere/app.json", content: "",
        });
        const result = await InfrastructureAspect.extract(p, undefined) as FP;
        assert.deepStrictEqual(result.data.tags.sort(), [
            "google-app-engine",
        ]);
    });
});
