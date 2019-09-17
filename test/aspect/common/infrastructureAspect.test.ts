import { InMemoryProject } from "@atomist/automation-client";
import { FP } from "@atomist/sdm-pack-fingerprint";
import * as assert from "assert";
import { InfrastructureAspect } from "../../../lib/aspect/common/infrastructureAspect";

describe("the infrastructure aspect", () => {
    it("finds all the tags", async () => {
        const p = InMemoryProject.of({
            path: ".travis.yml", content: "",
        }, {
            path: "anywhere/something.tf", content: "",
        }, {
            path: "anywhere/docker-compose.yml", content: "",
        }, {
            path: "anywhere/Dockerfile", content: "",
        }, {
            path: "anywhere/manifest.yml", content: "",
        }, {
            path: "anywhere/app.yml", content: "",
        }, {
            path: "anywhere/.openshift/stuff", content: "",
        }, {
            path: "README.md", content: `We deploy to Heroku!
            git push --force heroku master
            # etc etc`,
        }, {
            path: "bin/deploy", content: "ansible-playbook etc etc etc",
        });
        const result = await InfrastructureAspect.extract(p, undefined) as FP;
        assert.deepStrictEqual(result.data.tags.sort(), ["ansible",
            "cloudfoundry",
            "docker",
            "docker-compose",
            "google-app-engine",
            "heroku",
            "openshift",
            "terraform"]);
    });

    it("recognizes both spellings of yaml", async () => {

        const p = InMemoryProject.of({
            path: "anywhere/app.yaml", content: "",
        });
        const result = await InfrastructureAspect.extract(p, undefined) as FP;
        assert(result);
        assert.deepStrictEqual(result.data.tags.sort(), [
            "google-app-engine",
        ]);
    });

    it("recognizes three kinds of app.json/yml/yaml", async () => {

        const p = InMemoryProject.of({
            path: "anywhere/app.json", content: "",
        });
        const result = await InfrastructureAspect.extract(p, undefined) as FP;
        assert.deepStrictEqual(result.data.tags.sort(), [
            "google-app-engine",
        ]);
    });
});
