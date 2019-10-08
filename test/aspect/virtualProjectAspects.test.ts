import { GitCommandGitProject } from "@atomist/automation-client";
import * as assert from "assert";
import { VirtualProjectAspects } from "../../lib/aspect/aspects";

describe("VirtualProjectAspects", () => {

    it.skip("should not fail", async () => {
        const p = await GitCommandGitProject.fromExistingDirectory({
            owner: "sdm-org",
            repo: "engine-and-editor",
            branch: "master",
        } as any, "/Users/cdupuis/Desktop/engine-and-editor");
        const fps = await VirtualProjectAspects.extract(p, {} as any);
        assert.strictEqual(fps, undefined);
    });

});
