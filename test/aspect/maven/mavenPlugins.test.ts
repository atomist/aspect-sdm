import { GitCommandGitProject, GitHubRepoRef, InMemoryProject, Project } from "@atomist/automation-client";
import { MavenBuildPlugins } from "../../../lib/aspect/maven/mavenPlugins";
import { ZipkinPom } from "./zipkinPom";

describe("maven plugins", () => {

    it("should parse zipkin", async () => {
        const project = InMemoryProject.of(
            { path: "pom.xml", content: ZipkinPom },
        );
        const extracted = await MavenBuildPlugins.extract(project, undefined);
        console.log(JSON.stringify(extracted));
    }).timeout(200000);

});

async function loadProject(): Promise<Project> {
    return GitCommandGitProject.cloned(undefined, new GitHubRepoRef(
        "xylocarp-whelky", "zipkin"));
}