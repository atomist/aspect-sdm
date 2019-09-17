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
import { FP, NpmDeps } from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import { FrameworkAspect } from "../../../lib/aspect/common/frameworkAspect";
import { NonSpringPom, springBootPom } from "./testPoms";
import { angularPackageJson, pokedexPackageJson } from "./testPackageJsons";
import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import { adoptAHydrantGemfile, gemnasiumGemfile } from "./testGemfiles";

describe("frameworkAspect", () => {

    describe("node", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await doExtract(p);
            return assert.strictEqual(fp.data.tags.length, 0);
        });

        it("finds node from package.json", async () => {
            const p = InMemoryProject.of({
                path: "package.json", content: "something",
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["node"]);
        });

    });

    describe("spring boot", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await doExtract(p);
            return assert.strictEqual(fp.data.tags.length, 0);
        });

        it("doesn't find in non spring project", async () => {
            const p = InMemoryProject.of({
                path: "pom.xml", content: NonSpringPom,
            });
            const fp = await doExtract(p);
            return assert.strictEqual(fp.data.tags.length, 0);
        });

        it("finds spring boot from pom", async () => {
            const p = InMemoryProject.of({
                path: "pom.xml", content: springBootPom(),
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["spring-boot"]);
        });

        it("should find spring boot from Gradle");

    });

    describe("react", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await doExtract(p);
            return assert.strictEqual(fp.data.tags.length, 0);
        });

        it("finds no react in package.json", async () => {
            const p = InMemoryProject.of({
                path: "package.json", content: "i am package json",
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["node"]);
        });

        it("finds react in package.json", async () => {
            const p = InMemoryProject.of({
                path: "package.json", content: pokedexPackageJson,
            });
            const fps = await NpmDeps.extract(p, undefined);
            const result = toArray(await FrameworkAspect.consolidate(toArray(fps), undefined, undefined));
            assert.strictEqual(result.length, 1);
            const fp = result[0];
            return assert.deepStrictEqual(fp.data.tags, ["react"]);
        });

    });

    describe("angular", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await doExtract(p);
            return assert.strictEqual(fp.data.tags.length, 0);
        });

        it("finds no angular in package.json", async () => {
            const p = InMemoryProject.of({
                path: "package.json", content: pokedexPackageJson,
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["node"]);
        });

        it("finds angular in package.json", async () => {
            const p = InMemoryProject.of({
                path: "package.json", content: angularPackageJson,
            });
            const fps = await NpmDeps.extract(p, undefined);
            const result = toArray(await FrameworkAspect.consolidate(toArray(fps), undefined, undefined));
            assert.strictEqual(result.length, 1);
            const fp = result[0];
            return assert.deepStrictEqual(fp.data.tags, ["angular"]);
        });

    });

    describe("rails", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await doExtract(p);
            return assert.strictEqual(fp.data.tags.length, 0);
        });

        it("finds no rails in gemfile", async () => {
            const p = InMemoryProject.of({
                path: "Gemfile", content: gemnasiumGemfile,
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, []);
        });

        it("finds rails in gemfile with single quotes", async () => {
            const p = InMemoryProject.of({
                path: "Gemfile", content: adoptAHydrantGemfile,
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["rails"]);
        });

        it("finds rails in gemfile with double quotes", async () => {
            const p = InMemoryProject.of({
                path: "Gemfile", content: `gem "rails"`,
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["rails"]);
        });

    });

    describe("Django", () => {

        it("doesn't find in empty project", async () => {
            const p = InMemoryProject.of();
            const fp = await doExtract(p);
            return assert.strictEqual(fp.data.tags.length, 0);
        });

        it("finds no Django in gemfile", async () => {
            const p = InMemoryProject.of({
                path: "Gemfile", content: gemnasiumGemfile,
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, []);
        });

        it("finds no Django in non Django-ey requirements.txt", async () => {
            const p = InMemoryProject.of({
                path: "requirements.txt",
                content: `notDjango==2.2.1
docutils==0.14`,
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, []);
        });

        it("finds Django in Django-ey requirements.txt", async () => {
            const p = InMemoryProject.of({
                path: "requirements.txt",
                content: `Django==2.2.1
docutils==0.14`,
            });
            const fp = await doExtract(p);
            return assert.deepStrictEqual(fp.data.tags, ["django"]);
        });

    });

});

async function doExtract(p: Project): Promise<FP<ClassificationData>> {
    return FrameworkAspect.extract(p, undefined) as any;
}
