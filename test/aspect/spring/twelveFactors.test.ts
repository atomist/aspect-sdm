import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import { fingerprintOf } from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import {
    SpringBootAppClassAspectName,
    SpringBootAppData,
} from "../../../lib/aspect/spring/springBootApps";
import {
    SingleProjectPerRepoAspect,
    SingleProjectPerRepoFactor,
    TwelveFactorClassificationAspect,
    TwelveFactorCountAspect,
    TwelveFactorElement,
    TwelveFactorSpringBootFingerprintName,
} from "../../../lib/aspect/spring/twelveFactors";

describe("twelve factors", () => {
    describe("count", () => {
        it("should have a count of 1 if there is a 12 factor fingerprint", async () => {
            const twelveFactorFP = fingerprintOf<TwelveFactorElement>({
                type: TwelveFactorSpringBootFingerprintName,
                data: {
                    factor: SingleProjectPerRepoFactor,
                    fulfilled: false,
                },
            });
            const consolidation = toArray(await TwelveFactorCountAspect.consolidate([twelveFactorFP], undefined, undefined));
            assert(consolidation.length === 1);
            assert.strictEqual(consolidation[0].data.count, 1);
        });
    });

    describe("single project per repo", () => {
        it("should have unfulfilled 12 factor element when there are no usable fingerprints", async () => {
            const consolidation = toArray(await SingleProjectPerRepoAspect.consolidate([], undefined, undefined));
            assert(consolidation.length === 1);
            assert.strictEqual(consolidation[0].data.factor, SingleProjectPerRepoFactor);
            assert.strictEqual(consolidation[0].data.fulfilled, false);
        });

        it("should have fulfilled 12 factor element when there is a single spring boot app fingerprint", async () => {
            const springAppClassFP = fingerprintOf<SpringBootAppData>({
                type: SpringBootAppClassAspectName,
                data: {
                    applicationClassPackage: "foo",
                    applicationClassName: "bar",
                },
            });
            const consolidation = toArray(await SingleProjectPerRepoAspect.consolidate([springAppClassFP], undefined, undefined));
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
            const consolidation = toArray(await SingleProjectPerRepoAspect.consolidate(
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
            assert.deepStrictEqual(consolidation[0].data.tags, ["single-project-per-repo"]);
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
            assert(consolidation.length === 1);
            assert.deepStrictEqual(consolidation[0].data.tags, []);
        });
    });
});
