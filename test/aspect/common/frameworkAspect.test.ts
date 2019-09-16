import { InMemoryProject, Project } from "@atomist/automation-client";
import { FrameworkAspect } from "../../../lib/aspect/common/frameworkAspect";
import { FP } from "@atomist/sdm-pack-fingerprint";
import { ClassificationData } from "@atomist/sdm-pack-aspect";
import * as assert from "assert";

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

});

async function doExtract(p: Project): Promise<FP<ClassificationData>> {
    return FrameworkAspect.extract(p, undefined) as any;
}
