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

import {
    adjustBy,
    commonScorers, FiveStar,
    RepositoryScorer,
} from "@atomist/sdm-pack-aspect";
import {
    DefaultPackageJavaFiles,
    JspFiles,
} from "./aspects";
import * as idioms from "./spring/idioms";
import { isSpringBootVersionFingerprint, SpringBootVersion } from "./spring/springBootVersion";
import {
    isConsoleLoggingFingerprint,
    isSpringBootAppClassFingerprint,
} from "./spring/twelveFactors";
import { XmlBeanDefinitions } from "./spring/xmlBeans";

export function createScorers(): RepositoryScorer[] {
    const allScorers = [
        // Penalize for not enough known about this repository
        commonScorers.anchorScoreAt(3),
        ...generalScorers(),
        ...springIdiomScorers(),
        ...springTwelveFactorScorers(),
    ];
    return allScorers;
}

export function generalScorers(): RepositoryScorer[] {
    return [
        commonScorers.penalizeForExcessiveBranches({ branchLimit: 5 }),
        commonScorers.requireRecentCommit({ days: 10 }),
        // TODO Exposed secrets
    ];
}

export function springIdiomScorers(): RepositoryScorer[] {
    return [
        ...commonScorers.penalizeForAllReviewViolations({
            reviewerNames: [
                idioms.NonSpecificMvcAnnotationName,
                idioms.HardCodedPropertyName,
                idioms.DotStarUsageName,
                idioms.MutableInjectionUsageName,
            ],
            violationsPerPointLost: 2,
        }),
        commonScorers.penalizeGlobMatches({
            type: XmlBeanDefinitions.name,
            pointsLostPerMatch: 2,
        }),
        commonScorers.penalizeGlobMatches({
            type: JspFiles.name,
            pointsLostPerMatch: 2,
        }),
        commonScorers.penalizeGlobMatches({
            type: DefaultPackageJavaFiles.name,
            pointsLostPerMatch: 3,
        }),
        penalizeOldBootVersions({}),
    ];
}

export function springTwelveFactorScorers(): RepositoryScorer[] {
    return [
        commonScorers.penalizeForReviewViolations({
            reviewerName: idioms.FileIOUsageName,
            violationsPerPointLost: 2,
        }),
        requireLoggingToConsole(),
    ];
}

export function requireLoggingToConsole(): RepositoryScorer {
    return {
        name: "require-console-logging",
        scoreFingerprints: async rts => {
            const ltc = rts.analysis.fingerprints.find(isConsoleLoggingFingerprint);
            const sbs = rts.analysis.fingerprints.find(isSpringBootAppClassFingerprint);
            if (!!ltc && !!sbs) {
                return {
                    reason: `Console logging is required - status is ${ltc.data.present}`,
                    score: ltc.data.present ? 5 : 1,
                };
            }
            return undefined;
        },
    };
}

export function penalizeOldBootVersions(opts: { }): RepositoryScorer {
    return {
        name: "spring-boot-version",
        scoreFingerprints: async rts => {
            const sbv = rts.analysis.fingerprints.find(isSpringBootVersionFingerprint);
            if (!sbv) {
                return undefined;
            }
            const versions = sbv.data.matches.map(m => m.version);
            let score: FiveStar = 5;
            score = adjustBy(-5 * versions.filter(v => v.startsWith("1.0")).length, score);
            score = adjustBy(-5 * versions.filter(v => v.startsWith("1.1")).length, score);
            score = adjustBy(-5 * versions.filter(v => v.startsWith("1.2")).length, score);
            score = adjustBy(-4.5 * versions.filter(v => v.startsWith("1.3")).length, score);
            score = adjustBy(-4 * versions.filter(v => v.startsWith("1.4")).length, score);
            score = adjustBy(-3 * versions.filter(v => v.startsWith("1.5")).length, score);
            score = adjustBy(-1 * versions.filter(v => v.startsWith("2.0")).length, score);
            // TODO if not release version, mark that down
            return {
                reason: `Spring Boot version is ${SpringBootVersion.toDisplayableFingerprint(sbv)}`,
                score,
            };
        },
    };
}
