import { TokenCredentials } from "@atomist/automation-client";
import {
    GoalExecutionListener,
    SdmGoalState,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { getCategories } from "@atomist/sdm-pack-aspect/lib/customize/categories";
import { toName } from "@atomist/sdm-pack-fingerprints/lib/adhoc/preferences";
import {
    Diff,
    FingerprintDiffHandler,
    FP,
} from "@atomist/sdm-pack-fingerprints/lib/machine/Aspect";
import {
    displayName,
    displayValue,
} from "@atomist/sdm-pack-fingerprints/lib/machine/Aspects";
import { codeLine } from "@atomist/slack-messages";
import { ChecksUpdateParamsOutput } from "@octokit/rest";
import { api } from "../util/gitHubApi";

export function checkDiffHandler(sdm: SoftwareDeliveryMachine): FingerprintDiffHandler {
    return async (pli, diffs, aspect) => {
        const repo = pli.push.repo;

        if (repo.defaultBranch !== pli.push.branch) {
            return [];
        }

        // Find all policy discrepancies
        const discrepancies: Array<{ diff: Diff, target: FP<any> }> = [];
        let targetCount = 0;
        for (const diff of diffs) {
            const target = diff.targets.TeamConfiguration.find(tc => tc.name === toName(diff.to.type, diff.to.name));
            targetCount = diff.targets.TeamConfiguration.filter(tc => tc.name.startsWith(`${diff.to.type}::`)).length;
            if (!!target) {
                const targetFp = JSON.parse(target.value);
                if (targetFp.sha !== diff.to.sha) {
                    discrepancies.push({ diff, target: targetFp });
                }
            }
        }

        if (discrepancies.length === 0) {
            return [];
        }

        const { credentials, context, push } = pli;
        const github = api((credentials as TokenCredentials).token, push.repo.org.provider.apiUrl);
        const check = await github.checks.get({
            check_run_id: getFromContext(context).id,
            owner: push.repo.owner,
            repo: push.repo.name,
        });

        let output: ChecksUpdateParamsOutput;
        if (!check.data.output.title) {
            output = {
                title: "Policy differences",
                summary: "The following differences from set policies have been detected",
                text: "",
            };
        } else {
            output = check.data.output;
        }

        const text = `## ${aspect.displayName}

${targetCount} ${targetCount === 1 ? "Policy" : "Polices"} set - Compliance ${ ((1 - (discrepancies.length / targetCount)) * 100).toFixed(0)}% - [Manage](https://app.atomist.com/workspace/${context.workspaceId}/analysis/manage?category=${encodeURIComponent(getCategories(aspect)[0])}&aspect=${encodeURIComponent(aspect.displayName)}) 
        
${discrepancies.map(d => `* ${codeLine(displayName(aspect, d.diff.to))} at ${codeLine(displayValue(aspect, d.diff.to))} - Policy: ${codeLine(displayValue(aspect, d.target))} - [Manage](https://app.atomist.com/workspace/${context.workspaceId}/analysis/enable?fingerprint=${encodeURIComponent(d.diff.to.name)}&category=${encodeURIComponent(getCategories(aspect)[0])}&aspect=${encodeURIComponent(aspect.displayName)})`).join("\n")}`;
        output.text = `${output.text}\n\n${text}`;

        await github.checks.update({
            check_run_id: getFromContext(context).id,
            owner: push.repo.owner,
            repo: push.repo.name,
            output,
        });

        return [];
    };
}

export const CheckGoalExecutionListener: GoalExecutionListener = async li => {
    const { credentials, goalEvent, context } = li;

    if (goalEvent.push.repo.defaultBranch !== goalEvent.push.branch) {
        return;
    }

    const github = api((credentials as TokenCredentials).token, goalEvent.push.repo.org.provider.apiUrl);

    if (goalEvent.state === SdmGoalState.in_process) {
        const checks = await github.checks.listForRef({
            owner: goalEvent.repo.owner,
            repo: goalEvent.repo.name,
            check_name: "policy/atomist",
            ref: goalEvent.sha,
        });
        if (checks.data.total_count > 0) {
            storeInContext({ id: checks.data.check_runs[0].id }, context);
        } else {
            const check = await github.checks.create({
                owner: goalEvent.repo.owner,
                repo: goalEvent.repo.name,
                name: "policy/atomist",
                head_sha: goalEvent.sha,
                external_id: goalEvent.goalSetId,
                status: "in_progress",
                details_url: `https://app.atomist.com/workspace/${context.workspaceId}/analysis`,
            });
            storeInContext({ id: check.data.id }, context);
        }
    } else {
        const check = await github.checks.get({
            check_run_id: getFromContext(context).id,
            owner: goalEvent.push.repo.owner,
            repo: goalEvent.push.repo.name,
        });
        const conclusion = !!check.data.output ? "action_required" : "success";
        await github.checks.update({
            check_run_id: getFromContext(context).id,
            owner: goalEvent.repo.owner,
            repo: goalEvent.repo.name,
            status: "completed",
            conclusion,
        });
    }
};

function storeInContext(obj: { id: number }, context: any): void {
    context.__check = obj;
}

function getFromContext(context: any): { id: number } {
    return context.__check;
}

