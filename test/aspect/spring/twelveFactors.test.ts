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

import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import { fingerprintOf } from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import { ConsoleLoggingType } from "../../../lib/aspect/spring/consoleLogging";
import {
    SpringBootAppClassAspectName,
    SpringBootAppData,
} from "../../../lib/aspect/spring/springBootApps";
import {
    ConsoleLoggingFactor,
    ConsoleLoggingFactorAspect,
    SingleProjectPerRepoFactor,
    SingleProjectPerRepoFactorAspect,
    TwelveFactorClassificationAspect,
    TwelveFactorCountAspect,
    TwelveFactorElement,
    TwelveFactorSpringBootFingerprintName,
} from "../../../lib/aspect/spring/twelveFactors";

describe("twelve factors", () => {
    describe("count", () => {
        it("should have a count of 1 if there is a fulfilled 12 factor fingerprint", async () => {
            const twelveFactorFP = fingerprintOf<TwelveFactorElement>({
                type: TwelveFactorSpringBootFingerprintName,
                data: {
                    factor: SingleProjectPerRepoFactor,
                    fulfilled: true,
                },
            });
            const consolidation = toArray(await TwelveFactorCountAspect.consolidate([twelveFactorFP], undefined, undefined));
            assert(consolidation.length === 1);
            assert.strictEqual(consolidation[0].data.count, 1);
        });

        it("should not have a count of 0 if there is an unfulfilled 12 factor fingerprint", async () => {
            const twelveFactorFP = fingerprintOf<TwelveFactorElement>({
                type: TwelveFactorSpringBootFingerprintName,
                data: {
                    factor: SingleProjectPerRepoFactor,
                    fulfilled: false,
                },
            });
            const consolidation = toArray(await TwelveFactorCountAspect.consolidate([twelveFactorFP], undefined, undefined));
            assert(consolidation.length === 0);
        });
    });

    describe("single project per repo", () => {
        it("should not have unfulfilled 12 factor element when there are no usable fingerprints", async () => {
            const consolidation = toArray(await SingleProjectPerRepoFactorAspect.consolidate([], undefined, undefined));
            assert(consolidation.length === 0);
        });

        it("should have fulfilled 12 factor element when there is a single spring boot app fingerprint", async () => {
            const springAppClassFP = fingerprintOf<SpringBootAppData>({
                type: SpringBootAppClassAspectName,
                data: {
                    applicationClassPackage: "foo",
                    applicationClassName: "bar",
                },
            });
            const consolidation = toArray(await SingleProjectPerRepoFactorAspect.consolidate([springAppClassFP], undefined, undefined));
            assert(consolidation.length === 1);
            assert.strictEqual(consolidation[0].data.factor, SingleProjectPerRepoFactor);
            assert.strictEqual(consolidation[0].data.fulfilled, true);
        });

        it("should not tag when there are multiple spring boot app fingerprint", async () => {
            const springAppClassFP = fingerprintOf<SpringBootAppData>({
                type: SpringBootAppClassAspectName,
                data: {
                    applicationClassPackage: "foo",
                    applicationClassName: "bar",
                },
            });
            const springAppClassFP2 = fingerprintOf<SpringBootAppData>({
                type: SpringBootAppClassAspectName,
                data: {
                    applicationClassPackage: "foo",
                    applicationClassName: "baz",
                },
            });
            const consolidation = toArray(await SingleProjectPerRepoFactorAspect.consolidate(
                [springAppClassFP, springAppClassFP2], undefined, undefined));
            assert(consolidation.length === 1);
            assert.strictEqual(consolidation[0].data.factor, SingleProjectPerRepoFactor);
            assert.strictEqual(consolidation[0].data.fulfilled, false);
        });

        it("should tag when there is a fulfilled 12 factor element", async () => {
            const twelveFactorFP = fingerprintOf<TwelveFactorElement>({
                type: TwelveFactorSpringBootFingerprintName,
                data: {
                    factor: SingleProjectPerRepoFactor,
                    fulfilled: true,
                },
            });
            const consolidation = toArray(await TwelveFactorClassificationAspect.consolidate([twelveFactorFP], undefined, undefined));
            assert(consolidation.length === 1);
            assert.deepStrictEqual(consolidation[0].name, "twelve-factor:single-project-per-repo");
        });

        it("should not tag when there is an unfulfilled 12 factor element", async () => {
            const twelveFactorFP = fingerprintOf<TwelveFactorElement>({
                type: TwelveFactorSpringBootFingerprintName,
                data: {
                    factor: SingleProjectPerRepoFactor,
                    fulfilled: false,
                },
            });
            const consolidation = toArray(await TwelveFactorClassificationAspect.consolidate([twelveFactorFP], undefined, undefined));
            assert.strictEqual(consolidation.length, 0);
        });

        describe("single project per repo", () => {
            it("should not have unfulfilled 12 factor element when there are no usable fingerprints", async () => {
                const consolidation = toArray(await SingleProjectPerRepoFactorAspect.consolidate([], undefined, undefined));
                assert(consolidation.length === 0);
            });

            it("should have fulfilled 12 factor element when there is a single spring boot app fingerprint", async () => {
                const springAppClassFP = fingerprintOf<SpringBootAppData>({
                    type: SpringBootAppClassAspectName,
                    data: {
                        applicationClassPackage: "foo",
                        applicationClassName: "bar",
                    },
                });
                const consolidation = toArray(await SingleProjectPerRepoFactorAspect.consolidate([springAppClassFP], undefined, undefined));
                assert(consolidation.length === 1);
                assert.strictEqual(consolidation[0].data.factor, SingleProjectPerRepoFactor);
                assert.strictEqual(consolidation[0].data.fulfilled, true);
            });
        });

        describe("console logging", () => {
            it("should have unfulfilled 12 factor element when there are no usable fingerprints", async () => {
                const consolidation = toArray(await ConsoleLoggingFactorAspect.consolidate([], undefined, undefined));
                assert.strictEqual(consolidation.length , 1);
                assert.strictEqual(consolidation[0].data.factor, ConsoleLoggingFactor);
                assert.strictEqual(consolidation[0].data.fulfilled, false);
            });

            it("should have fulfilled 12 factor element when there is a single spring boot app fingerprint", async () => {
                const fp = fingerprintOf<{present: boolean}>({
                    type: ConsoleLoggingType,
                    data: {
                        present: true,
                    },
                });
                const consolidation = toArray(await ConsoleLoggingFactorAspect.consolidate([fp], undefined, undefined));
                assert(consolidation.length === 1);
                assert.strictEqual(consolidation[0].data.factor, ConsoleLoggingFactor);
                assert.strictEqual(consolidation[0].data.fulfilled, true);
            });

            it("should tag when there is a fulfilled 12 factor element", async () => {
                const twelveFactorFP = fingerprintOf<TwelveFactorElement>({
                    type: TwelveFactorSpringBootFingerprintName,
                    data: {
                        factor: ConsoleLoggingFactor,
                        fulfilled: true,
                    },
                });
                const consolidation = toArray(await TwelveFactorClassificationAspect.consolidate([twelveFactorFP], undefined, undefined));
                assert(consolidation.length === 1);
                assert.deepStrictEqual(consolidation[0].name, "twelve-factor:console-logging");
            });
        });
    });
});
