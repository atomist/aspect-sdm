import { SoftwareDeliveryMachine } from "@atomist/sdm";
import {
    CiAspect,
    JavaBuild,
    StackAspect,
} from "@atomist/sdm-pack-aspect";
import {
    registerCategories,
    registerReportDetails,
} from "@atomist/sdm-pack-aspect/lib/customize/categories";
import { LeinDeps } from "@atomist/sdm-pack-clojure/lib/fingerprints/clojure";
import {
    DockerfilePath,
    DockerPorts,
} from "@atomist/sdm-pack-docker";
import { Aspect } from "@atomist/sdm-pack-fingerprints";
import { DockerFrom } from "./docker/docker";
import { branchCount } from "./git/branchCount";
import { K8sSpecs } from "./k8s/specAspect";
import { MavenDirectDependencies } from "./maven/mavenDirectDependencies";
import { MavenParentPom } from "./maven/parentPom";
import { NpmDependencies } from "./node/npmDependencies";
import { TypeScriptVersion } from "./node/TypeScriptVersion";
import { SpringBootStarter } from "./spring/springBootStarter";
import { SpringBootVersion } from "./spring/springBootVersion";
import { TravisScriptsAspect } from "./travis/travisAspect";

export function createAspects(sdm: SoftwareDeliveryMachine): Aspect[] {
    const isStaging = sdm.configuration.endpoints.api.includes("staging");
    const optionalAspects = isStaging ? [] : [];

    const aspects = [
        DockerFrom,
        DockerfilePath,
        DockerPorts,
        SpringBootStarter,
        TypeScriptVersion,
        NpmDependencies,
        TravisScriptsAspect,
        StackAspect,
        CiAspect,
        JavaBuild,
        SpringBootVersion,
        MavenDirectDependencies,
        MavenParentPom,
        K8sSpecs,
        branchCount,
        LeinDeps,
        ...optionalAspects,
    ];

    // TODO cd merge into one call
    registerCategories(TypeScriptVersion, "Node.js");
    registerReportDetails(TypeScriptVersion, {
        name: "TypeScript versions",
        shortName: "version",
        unit: "version",
        url: "fingerprint/typescript-version/typescript-version?byOrg=true",
        description: "TypeScript versions in use across all repositories in your workspace, " +
            "broken out by version and repositories that use each version.",
    });
    registerCategories(NpmDependencies, "Node.js");
    registerReportDetails(NpmDependencies, {
        shortName: "dependency",
        unit: "version",
        url: "drift?type=npm-project-deps&band=true",
        description: "Node direct dependencies in use across all repositories in your workspace, " +
            "grouped by Drift Level.",
    });
    registerCategories(MavenDirectDependencies, "Java");
    registerReportDetails(MavenDirectDependencies, {
        shortName: "dependency",
        unit: "version",
        url: "drift?type=maven-direct-dep&band=true",
        description: "Maven declared dependencies in use across all repositories in your workspace, " +
            "grouped by Drift Level.",
    });
    registerCategories(MavenParentPom, "Java");
    registerReportDetails(MavenParentPom, {
        shortName: "parent",
        unit: "version",
        url: `drift?type=${MavenParentPom.name}&band=true`,
        description: "Maven parent POM in use across all repositories in your workspace, " +
            "grouped by Drift Level.",
    });
    registerCategories(LeinDeps, "Java");
    registerReportDetails(LeinDeps, {
        shortName: "dependency",
        unit: "version",
        url: "drift?type=clojure-project-deps&band=true",
        description: "Leiningen direct dependencies in use across all repositories in your workspace, " +
            "grouped by Drift Level.",
    });
    registerCategories(DockerFrom, "Docker");
    registerReportDetails(DockerFrom, {
        name: "Docker base images",
        shortName: "images",
        unit: "tag",
        url: "fingerprint/docker-base-image/*?byOrg=true&presence=false&progress=false&otherLabel=false&trim=false",
        description: "Docker base images in use across all repositories in your workspace, " +
            "broken out by image label and repositories where used.",
    });
    registerCategories(DockerPorts, "Docker");
    registerReportDetails(DockerPorts, {
        shortName: "ports",
        unit: "port",
        url: "fingerprint/docker-ports/*?byOrg=true&presence=false&progress=false&otherLabel=false&trim=false",
        description: "Ports exposed in Docker configuration in use  across all repositories in your workspace, " +
            "broken out by port number and repositories where used.",
        manage: false,
    });
    registerCategories(branchCount, "Git");
    registerReportDetails(branchCount, {
        shortName: "branches",
        unit: "branch",
        url: `fingerprint/${branchCount.name}/${branchCount.name}?byOrg=true&presence=false&progress=false&otherLabel=false&trim=false`,
        description: "Number of Git branches across repositories in your workspace, " +
            "grouped by Drift Level.",
        manage: false,
    });
    return aspects;
}
