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
import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import { ClassificationData } from "@atomist/sdm-pack-aspect";
import {
    FP,
    NpmDeps,
} from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import { FrameworkAspect } from "../../../lib/aspect/common/frameworkAspect";
import {
    adoptAHydrantGemfile,
    gemnasiumGemfile,
} from "./testGemfiles";
import {
    angularPackageJson,
    pokedexPackageJson,
} from "./testPackageJsons";
import {
    NonSpringPom,
    springBootPom,
} from "./testPoms";

describe("frameworkAspect", () => {

    describe("node", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fps = await doExtract(p);
            return assert.strictEqual(fps.length, 0);
        });

        it("finds node from package.json", async () => {
            const p = InMemoryProject.of({
                path: "package.json", content: "something",
            });
            const fps = await doExtract(p);
            assert.strictEqual(fps.length, 1);
            return assert(fps.some(fp => fp.name === "node"));
        });

        it("finds node from package.json lower down", async () => {
            const p = InMemoryProject.of({
                path: "thing/two/package.json", content: "something",
            });
            const fps = await doExtract(p);
            assert.strictEqual(fps.length, 1);
            return assert(fps.some(fp => fp.name === "node"));
        });

    });

    describe("spring boot", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fps = await doExtract(p);
            return assert.strictEqual(fps.length, 0);
        });

        it("doesn't find in non spring project", async () => {
            const p = InMemoryProject.of({
                path: "pom.xml", content: NonSpringPom,
            });
            const fps = await doExtract(p);
            return assert.strictEqual(fps.length, 0);
        });

        it("finds spring boot from pom", async () => {
            const p = InMemoryProject.of({
                path: "pom.xml", content: springBootPom(),
            });
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "spring-boot"));
        });

        it("finds spring boot from pom lower down", async () => {
            const p = InMemoryProject.of({
                path: "a/b/pom.xml", content: springBootPom(),
            });
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "spring-boot"));
        });

        it("should find spring boot from Gradle");

    });

    describe("react", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fps = await doExtract(p);
            return assert.strictEqual(fps.length, 0);
        });

        it("finds no react in package.json", async () => {
            const p = InMemoryProject.of({
                path: "package.json", content: "i am package json",
            });
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "node"));
        });

        it("finds react in package.json", async () => {
            const p = InMemoryProject.of({
                path: "package.json", content: pokedexPackageJson,
            });
            const fps = await NpmDeps.extract(p, undefined);
            const result = toArray(await FrameworkAspect.consolidate(toArray(fps), undefined, undefined));
            assert.strictEqual(result.length, 1);
            const cfp = result[0];
            return assert(cfp.name === "react");
        });

    });

    describe("angular", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fps = await doExtract(p);
            return assert.strictEqual(fps.length, 0);
        });

        it("finds no angular in package.json", async () => {
            const p = InMemoryProject.of({
                path: "package.json", content: pokedexPackageJson,
            });
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "node"));
        });

        it("finds angular in package.json", async () => {
            const p = InMemoryProject.of({
                path: "package.json", content: angularPackageJson,
            });
            const fps = await NpmDeps.extract(p, undefined);
            const result = toArray(await FrameworkAspect.consolidate(toArray(fps), undefined, undefined));
            assert.strictEqual(result.length, 1);
            return assert(result.some(fp => fp.name === "angular"));
        });

    });

    describe("rails", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fps = await doExtract(p);
            return assert.strictEqual(fps.length, 0);
        });

        it("finds no rails in gemfile", async () => {
            const p = InMemoryProject.of({
                path: "Gemfile", content: gemnasiumGemfile,
            });
            const fps = await doExtract(p);
            return assert.strictEqual(fps.length, 0);
        });

        it("finds rails in gemfile with single quotes", async () => {
            const p = InMemoryProject.of({
                path: "Gemfile", content: adoptAHydrantGemfile,
            });
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "rails"));
        });

        it("finds rails in gemfile further down with single quotes", async () => {
            const p = InMemoryProject.of({
                path: "some/path/to/the/Gemfile", content: adoptAHydrantGemfile,
            });
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "rails"));
        });

        it("finds rails in gemfile with double quotes", async () => {
            const p = InMemoryProject.of({
                path: "Gemfile", content: `gem "rails"`,
            });
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "rails"));
        });

    });

    describe("Django", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fps = await doExtract(p);
            return assert.strictEqual(fps.length, 0);
        });

        it("finds no Django in gemfile", async () => {
            const p = InMemoryProject.of({
                path: "Gemfile", content: gemnasiumGemfile,
            });
            const fps = await doExtract(p);
            return assert.strictEqual(fps.length, 0);
        });

        it("finds no Django in non Django-ey requirements.txt", async () => {
            const p = InMemoryProject.of({
                path: "requirements.txt",
                content: `notDjango==2.2.1
docutils==0.14`,
            });
            const fps = await doExtract(p);
            return assert.strictEqual(fps.length, 0);
        });

        it("finds Django in Django-ey requirements.txt", async () => {
            const p = InMemoryProject.of({
                path: "requirements.txt",
                content: `Django==2.2.1
docutils==0.14`,
            });
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "django"));
        });

        it("finds Django in Django-ey requirements.txt further down", async () => {
            const p = InMemoryProject.of({
                path: "a/is/greater/than/b/requirements.txt",
                content: `Django==2.2.1
docutils==0.14`,
            });
            const fps = await doExtract(p);
            return assert(fps.some(fp => fp.name === "django"));
        });

    });

});

async function doExtract(p: Project): Promise<Array<FP<ClassificationData>>> {
    return FrameworkAspect.extract(p, undefined) as any;
}
