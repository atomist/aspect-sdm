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

import { projectUtils } from "@atomist/automation-client";
import { projectClassificationAspect } from "@atomist/sdm-pack-aspect";
import { Aspect } from "@atomist/sdm-pack-fingerprint";

export const BuildToolName = "buildTool";

export const BuildToolAspect: Aspect = projectClassificationAspect({
        name: BuildToolName,
        // Deliberately don't display
        displayName: undefined,
        stopAtFirst: false,
        toDisplayableFingerprintName: () => "Build tool",
    },
    { tags: "maven", reason: "has Maven POM", test: async p => projectUtils.fileExists(p, "**/pom.xml")},
    {
      tags: "gradle",
      reason: "has build.gradle",
      test: async p => projectUtils.fileExists(p, ["**/build.gradle", "**/build.gradle.kts"]),
    },
    { tags: "ivy", reason: "has Ivy XML", test: async p => projectUtils.fileExists(p, "**/ivy.xml")},
    { tags: "ant", reason: "has ANT XML", test: async p => projectUtils.fileExists(p, "**/build.xml")},
    { tags: "sbt", reason: "has Scala SBT File", test: async p => projectUtils.fileExists(p, "**/build.sbt")},
    { tags: "npm", reason: "has NPM Package File", test: async p => projectUtils.fileExists(p, "**/package.json")},
    { tags: "grunt", reason: "has Gruntfile", test: async p => projectUtils.fileExists(p, "**/Gruntfile")},
    { tags: "nant", reason: "has NAnt Configuration", test: async p => projectUtils.fileExists(p, "**/NAnt.build")},
    { tags: "cake", reason: "has Cake Configuration", test: async p => projectUtils.fileExists(p, "**/build.cake")},
    { tags: "make", reason: "has Makefile", test: async p => projectUtils.fileExists(p, "**/Makefile")},
    { tags: "leiningen", reason: "has Leiningen", test: async p => projectUtils.fileExists(p, "project.clj")},
    { tags: "rake", reason: "has Rakefile", test: async p => projectUtils.fileExists(p, "**/Rakefile")},
    { tags: "buck", reason: "has Buck buildfile", test: async p => projectUtils.fileExists(p, "**/.buckconfig")},
    { tags: "gulp", reason: "has Gulp", test: async p => projectUtils.fileExists(p, "**/gulpfile.js")},
    { tags: "flutter", reason: "has Flutter", test: async p => projectUtils.fileExists(p, ["**/pubspec.yaml", "**/pubspec.yml"])},
    { tags: "cocoapods", reason: "has Cocoapods", test: async p => projectUtils.fileExists(p, "**/*.podspec")},
);
