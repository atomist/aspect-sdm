import { WorkspaceScorer } from "@atomist/sdm-pack-aspect";
import * as commonWorkspaceScorers from "@atomist/sdm-pack-aspect/lib/scorer/commonWorkspaceScorers";

export function createWorkspaceScorers(): WorkspaceScorer[] {
    return [
        commonWorkspaceScorers.AverageRepoScore,
        commonWorkspaceScorers.WorstRepoScore,
        commonWorkspaceScorers.EntropyScore,
    ];
}