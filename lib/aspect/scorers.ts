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

import { adjustBy, commonScorers, FiveStar, RepositoryScorer, RepoToScore } from "@atomist/sdm-pack-aspect";
import { VersionedArtifact } from "@atomist/sdm-pack-spring";
import { makeConditional, scoreOnFingerprintPresence } from "../aa-move/scorerUtils";
import { DefaultPackageJavaFiles, JspFiles } from "./aspects";
import { isDependencyFingerprint } from "./maven/mavenDirectDependencies";
import * as idioms from "./spring/idioms";
import { isSpringBootStarterFingerprint } from "./spring/springBootStarter";
import { isSpringBootVersionFingerprint, SpringBootVersion } from "./spring/springBootVersion";
import { isConsoleLoggingFingerprint, isSpringBootAppClassFingerprint } from "./spring/twelveFactors";
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

function isSpringRepo(rts: RepoToScore): boolean {
    const found = rts.analysis.fingerprints.find(isSpringBootVersionFingerprint);
    return found && found.data.matches.length > 0;
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
        rewardForSwagger(),
        rewardForLiquibase(),
        rewardForSpringSecurity(),
        penalizeForSpringDataRest(),
        rewardForFlyway(),
        rewardForKotlin(),
        penalizeForLog4j(),
    ].map(scorer => makeConditional(
        scorer,
        isSpringRepo));
}

export function springTwelveFactorScorers(): RepositoryScorer[] {
    return [
        commonScorers.penalizeForReviewViolations({
            reviewerName: idioms.FileIOUsageName,
            violationsPerPointLost: 2,
        }),
        requireLoggingToConsole(),
    ].map(scorer => makeConditional(
        // Only run these scorers on Spring projects
        scorer,
        isSpringRepo));
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

export function penalizeOldBootVersions(opts: {}): RepositoryScorer {
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

export function rewardForSwagger(): RepositoryScorer {
    return scoreOnMavenDependencyPresence({
        name: "uses-swagger",
        reason: "Swagger dependency",
        scoreWhenPresent: 5,
        test: va => va.artifact.includes("swagger"),
    });
}

export function rewardForLiquibase(): RepositoryScorer {
    return scoreOnMavenDependencyPresence({
        name: "uses-liquibase",
        reason: "Liquibase dependency",
        scoreWhenPresent: 5,
        test: va => va.artifact.includes("liquibase"),
    });
}

export function rewardForFlyway(): RepositoryScorer {
    return scoreOnMavenDependencyPresence({
        name: "uses-liquibase",
        reason: "Flyway dependency",
        scoreWhenPresent: 5,
        test: va => va.group === "org.flywaydb",
    });
}

export function penalizeForLog4j(): RepositoryScorer {
    return scoreOnMavenDependencyPresence({
        name: "uses-log4j",
        reason: "Log4j: Prefer logback",
        scoreWhenPresent: 3,
        test: va => va.artifact.includes("log4j"),
    });
}

export function rewardForSpringSecurity(): RepositoryScorer {
    return scoreOnFingerprintPresence({
        name: "uses-spring-security",
        reason: "Spring Security",
        scoreWhenPresent: 5,
        scoreWhenAbsent: 3,
        test: fp => isSpringBootStarterFingerprint(fp) && fp.data.artifact === "spring-boot-starter-security",
    });
}

export function penalizeForSpringDataRest(): RepositoryScorer {
    return scoreOnFingerprintPresence({
        name: "uses-spring-data-rest",
        reason: "Expose data selectively",
        scoreWhenPresent: 2,
        test: fp => isSpringBootStarterFingerprint(fp) && fp.data.artifact === "spring-boot-starter-data-rest",
    });
}

export function rewardForKotlin(): RepositoryScorer {
    return scoreOnFingerprintPresence({
            name: "has-kotlin",
            reason: "Kotlin files found",
            scoreWhenPresent: 5,
            test: fp => fp.type === "language" && fp.name === "kotlin",
        },
    );
}

export function scoreOnMavenDependencyPresence(opts: {
    name: string,
    scoreWhenPresent?: FiveStar,
    scoreWhenAbsent?: FiveStar,
    reason: string,
    test: (va: VersionedArtifact) => boolean,
}): RepositoryScorer {
    return scoreOnFingerprintPresence({
        ...opts,
        test: fp => isDependencyFingerprint(fp) && opts.test(fp.data),
    });
}