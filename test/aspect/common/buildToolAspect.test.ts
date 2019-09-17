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
import { ClassificationData } from "@atomist/sdm-pack-aspect";
import { FP } from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import { BuildToolAspect } from "../../../lib/aspect/common/buildToolAspect";
import { FrameworkAspect } from "../../../lib/aspect/common/frameworkAspect";

describe("buildToolAspect", () => {

    describe("multiple detection", () => {
        it("tags multiple times when different build tools are detected", async () => {
            const p = InMemoryProject.of({path: "build.xml", content: ""},
                {path: "ivy.xml", content: ""});
            const fp = await doExtract(p);
            return assert.notDeepStrictEqual(fp.data.tags, ["ivy", "nant"]);
        });
    });

    describe("Ivy", () => {
        it("tags projects built with Ivy", async () => {
            const p = InMemoryProject.of({path: "ivy.xml", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["ivy"]);
        });

        it("tags projects built with Ivy, file anywhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/ivy.xml", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["ivy"]);
        });
    });

    describe("Ant", () => {
        it("tags project built with Ant", async () => {
            const p = InMemoryProject.of({path: "build.xml", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["ant"]);
        });

        it("tags project built with Ant, file anywhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/build.xml", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["ant"]);
        });
    });

    describe("SBT", () => {
        it("tags SBT projects", async () => {
            const p = InMemoryProject.of({path: "build.sbt", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["sbt"]);
        });

        it("tags SBT projects, file anywhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/build.sbt", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["sbt"]);
        });
    });

    describe("NPM", () => {
        it("tags NPM projects", async () => {
            const p = InMemoryProject.of({path: "package.json", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["npm"]);
        });
    });

    describe("Grunt", () => {
        it("tags Grunt projects", async () => {
            const p = InMemoryProject.of({path: "Gruntfile", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["grunt"]);
        });

        it("tags Grunt projects, file somewhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/Gruntfile", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["grunt"]);
        });
    });

    describe("NAnt", () => {
        it("tags NAnt projects", async () => {
            const p = InMemoryProject.of({path: "NAnt.build", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["nant"]);
        });

        it("tags NAnt projects, file anywhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/NAnt.build", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["nant"]);
        });
    });

    describe("Cake", () => {
        it("tags Cake projects", async () => {
            const p = InMemoryProject.of({path: "build.cake", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["cake"]);
        });

        it("tags Cake projects, file somewhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/build.cake", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["cake"]);
        });
    });
    describe("make", () => {
        it("tags make", async () => {
            const p = InMemoryProject.of({path: "Makefile", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["make"]);
        });
    });
    describe("leiningen", () => {
        it("tags leiningen", async () => {
            const p = InMemoryProject.of({path: "project.clj", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["leiningen"]);
        });
    });
    describe("rake", () => {
        it("tags rake", async () => {
            const p = InMemoryProject.of({path: "Rakefile", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["rake"]);
        });
    });
    describe("buck", () => {
        it("tags buck", async () => {
            const p = InMemoryProject.of({path: "test/.buckconfig", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["buck"]);
        });
    });
    describe("gulp", () => {
        it("tags gulp", async () => {
            const p = InMemoryProject.of({path: "gulpfile.js", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["gulp"]);
        });
    });
    describe("flutter", () => {
        it("tags flutter yaml", async () => {
            const p = InMemoryProject.of({path: "pubspec.yaml", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["flutter"]);
        });
        it("tags flutter yml", async () => {
            const p = InMemoryProject.of({path: "pubspec.yml", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["flutter"]);
        });
    });
    describe("cocoapods", () => {
        it("tags cocoapods", async () => {
            const p = InMemoryProject.of({path: "test.podspec", content: ""});
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["cocoapods"]);
        });
    });
});

async function doExtract(p: Project): Promise<FP<ClassificationData>> {
    return BuildToolAspect.extract(p, undefined) as any;
}
