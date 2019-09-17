import { InMemoryProject, Project } from "@atomist/automation-client";
import { FP } from "@atomist/sdm-pack-fingerprint";
import { GlobAspectData } from "@atomist/sdm-pack-aspect";
import { XmlBeanDefinitions } from "../../../lib/aspect/spring/xmlBeans";

import * as assert from "assert";

describe("XML bean definitions", () => {

    it("should not find in empty project", async ()=> {
        const p = InMemoryProject.of();
        const fp = await doExtract(p);
        assert.deepStrictEqual(fp.data.matches, []);
    });

    it("should not find with non-Spring XML", async ()=> {
        const p = InMemoryProject.of({
            path: "thing.xml",
            content: "<xml></xml>"
        });
        const fp = await doExtract(p);
        assert.deepStrictEqual(fp.data.matches, []);
    });

});


async function doExtract(p: Project): Promise<FP<GlobAspectData>> {
    return XmlBeanDefinitions.extract(p, undefined) as any;
}
