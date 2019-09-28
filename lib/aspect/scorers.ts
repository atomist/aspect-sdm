import { adjustBy, commonScorers, RepositoryScorer } from "@atomist/sdm-pack-aspect";
import * as idioms from "./spring/idioms";
import { xmlBeanDefinitionFilesCount } from "./spring/xmlBeans";

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
        commonScorers.requireRecentCommit({ days: 10}),
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
        penalizeSpringBeanDefinitionsFiles({ pointsLostPerFile: 2.5 }),
    ];
}

export function springTwelveFactorScorers(): RepositoryScorer[] {
    return [
        commonScorers.penalizeForReviewViolations({
            reviewerName: idioms.FileIOUsageName,
            violationsPerPointLost: 2,
        }),
    ];
}

export function penalizeSpringBeanDefinitionsFiles(opts: { pointsLostPerFile: number}): RepositoryScorer {
    const scoreFingerprints = async repo => {
        const count = xmlBeanDefinitionFilesCount(repo.analysis.fingerprints);
        // You get the first 2 branches for free. After that they start to cost
        const score = adjustBy(-count * opts.pointsLostPerFile);
        return {
            score,
            reason: `${count} XML bean definition files: Should have none`,
        };
    };
    return {
        name: "xml-bean-file-count",
        scoreFingerprints,
        baseOnly: true,
    };
}