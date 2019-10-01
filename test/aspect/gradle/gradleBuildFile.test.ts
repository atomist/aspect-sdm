import { InMemoryProject } from "@atomist/automation-client";
import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import * as assert from "power-assert";
import { GradleBuildFiles } from "../../../lib/aspect/gradle/gradleBuildFile";

describe("Gradle build files", () => {
    it("should find Gradle build files in a project", async () => {
        const p = InMemoryProject.of(
        { path: "build.gradle", content: "" },
            { path: "main/build.gradle", content: ""},
        );
        const fp = toArray(await GradleBuildFiles.extract(p, undefined));
        assert.strictEqual(fp.length, 1);
        assert.strictEqual(fp[0].data.matches.length, 2);
        assert(fp[0].data.matches.find(m => m.path === "build.gradle"));
        assert(fp[0].data.matches.find(m => m.path === "main/build.gradle"));
    });
});
