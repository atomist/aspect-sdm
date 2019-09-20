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

describe("buildToolAspect", () => {

    describe("multiple detection", () => {
        it("tags multiple times when different build tools are detected", async () => {
            const p = InMemoryProject.of({path: "build.xml", content: ""},
                {path: "ivy.xml", content: ""});
            const fps = await doExtract(p);
            assert(fps.some(fp => fp.name === "ant"));
            return assert(fps.some(fp => fp.name === "ivy"));
        });
    });

    describe("Ivy", () => {
        it("tags projects built with Ivy", async () => {
            const p = InMemoryProject.of({path: "ivy.xml", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "ivy"));
        });

        it("tags projects built with Ivy, file anywhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/ivy.xml", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "ivy"));
        });
    });

    describe("Ant", () => {
        it("tags project built with Ant", async () => {
            const p = InMemoryProject.of({path: "build.xml", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "ant"));
        });

        it("tags project built with Ant, file anywhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/build.xml", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "ant"));
        });
    });

    describe("SBT", () => {
        it("tags SBT projects", async () => {
            const p = InMemoryProject.of({path: "build.sbt", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "sbt"));
        });

        it("tags SBT projects, file anywhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/build.sbt", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "sbt"));
        });
    });

    describe("NPM", () => {
        it("tags NPM projects", async () => {
            const p = InMemoryProject.of({path: "package.json", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "npm"));
        });
    });

    describe("Grunt", () => {
        it("tags Grunt projects", async () => {
            const p = InMemoryProject.of({path: "Gruntfile", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "grunt"));
        });

        it("tags Grunt projects, file somewhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/Gruntfile", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "grunt"));
        });
    });

    describe("NAnt", () => {
        it("tags NAnt projects", async () => {
            const p = InMemoryProject.of({path: "NAnt.build", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "nant"));
        });

        it("tags NAnt projects, file anywhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/NAnt.build", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "nant"));
        });
    });

    describe("Cake", () => {
        it("tags Cake projects", async () => {
            const p = InMemoryProject.of({path: "build.cake", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "cake"));
        });

        it("tags Cake projects, file somewhere in the project", async () => {
            const p = InMemoryProject.of({path: "some/path/build.cake", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "cake"));
        });
    });
    describe("make", () => {
        it("tags make", async () => {
            const p = InMemoryProject.of({path: "Makefile", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "make"));
        });
    });
    describe("leiningen", () => {
        it("tags leiningen", async () => {
            const p = InMemoryProject.of({path: "project.clj", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "leiningen"));
        });
    });
    describe("rake", () => {
        it("tags rake", async () => {
            const p = InMemoryProject.of({path: "Rakefile", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "rake"));
        });
    });
    describe("buck", () => {
        it("tags buck", async () => {
            const p = InMemoryProject.of({path: "test/.buckconfig", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "buck"));
        });
    });
    describe("gulp", () => {
        it("tags gulp", async () => {
            const p = InMemoryProject.of({path: "gulpfile.js", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "gulp"));
        });
    });
    describe("flutter", () => {
        it("tags flutter yaml", async () => {
            const p = InMemoryProject.of({path: "pubspec.yaml", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "flutter"));
        });
        it("tags flutter yml", async () => {
            const p = InMemoryProject.of({path: "pubspec.yml", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "flutter"));
        });
    });
    describe("cocoapods", () => {
        it("tags cocoapods", async () => {
            const p = InMemoryProject.of({path: "test.podspec", content: ""});
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "cocoapods"));
        });
    });
});

async function doExtract(p: Project): Promise<Array<FP<ClassificationData>>> {
    return BuildToolAspect.extract(p, undefined) as any;
}
