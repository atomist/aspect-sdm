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

/**
 * Identify common languages
 * @type {Aspect<ClassificationData>}
 */
export const LanguageAspect: Aspect = projectClassificationAspect(
    {
        name: "language",
        stopAtFirst: false,
        // Deliberately don't display
        displayName: undefined,
        toDisplayableFingerprintName: () => "Programming Language",
    },
    {
        tags: "c-lang",
        reason: "has C file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.[cC]"),
    },
    {
        tags: "c#",
        reason: "has C# file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.cs"),
    },
    {
        tags: "c++",
        reason: "has C++ file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.@(cpp|hpp|cxx|CC)"),
    },
    {
        tags: "clojure",
        reason: "has Clojure file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.@(clj|cljs|cljx)"),
    },
    {
        tags: "css",
        reason: "has CSS or transpiled CSS file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.@(css|sass|scss|less)"),
    },
    {
        tags: "dart",
        reason: "has Dart file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.dart"),
    },
    {
        tags: "elixir",
        reason: "has Elixir file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.@(ex|exs)"),
    },
    {
        tags: "golang",
        reason: "has Go file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.go"),
    },
    {
        tags: "html",
        reason: "has HTML file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.@(htm|html)"),
    },
    {
        tags: "java",
        reason: "has Java file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.java"),
    },
    {
        tags: "javascript",
        reason: "has Javascript file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.js"),
    },
    {
        tags: "kotlin",
        reason: "has Kotlin file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.@(kt|ktm|kts)"),
    },
    {
        tags: "objective-c",
        reason: "has Objective-C file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.@(m|mm|M)"),
    },
    {
        tags: "php",
        reason: "has PHP file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.php"),
    },
    {
        tags: "python",
        reason: "has requirements.txt",
        test: async p => p.hasFile("requirements.txt"),
    },
    {
        tags: "python",
        reason: "has Python file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.py"),
    },
    {
        tags: "r-lang",
        reason: "has R file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.r"),
    },
    {
        tags: "ruby",
        reason: "has Ruby file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.rb"),
    },
    {
        tags: "rust",
        reason: "has Rust file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.@(rs|rlib)"),
    },
    {
        tags: "scala",
        reason: "has Scala file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.@(scala|sc)"),
    },
    {
        tags: "swift",
        reason: "has Swift file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.swift"),
    },
    {
        tags: "typescript",
        reason: "has Typescript file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.ts"),
    },
    {
        tags: "vba",
        reason: "has VBA file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.vba"),
    },
    {
        tags: "web-assembly",
        reason: "has Web Assembly file(s)",
        test: async p => projectUtils.fileExists(p, "**/*.@(wat|wasm)"),
    },
);
