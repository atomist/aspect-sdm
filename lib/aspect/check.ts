import { TokenCredentials } from "@atomist/automation-client";
import {
    findSdmGoalOnCommit,
    Goal,
    GoalExecutionListener,
    SdmGoalState,
    SoftwareDeliveryMachine,
    updateGoal,
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
import { ComplicanceData } from "../../index";
import { api } from "../util/gitHubApi";

export function checkDiffHandler(sdm: SoftwareDeliveryMachine): FingerprintDiffHandler {
    return async (pli, diffs, aspect) => {
        const repo = pli.push.repo;

        if (repo.defaultBranch !== pli.push.branch || diffs.length === 0) {
            return [];
        }

        // Find all policy discrepancies
        const discrepancies: Array<{ diff: Diff, target: FP<any> }> = [];
        const targets = diffs[0].targets.TeamConfiguration.filter(tc => tc.name.startsWith(`${aspect.name}::`));
        const targetCount = targets.length;
        for (const diff of diffs) {
            const target = diff.targets.TeamConfiguration.find(tc => tc.name === toName(diff.to.type, diff.to.name));
            if (!!target) {
                const targetFp = JSON.parse(target.value);
                if (targetFp.sha !== diff.to.sha) {
                    discrepancies.push({ diff, target: targetFp });
                }
            }
        }

        const { credentials, context, push, id } = pli;
        const github = api((credentials as TokenCredentials).token, push.repo.org.provider.apiUrl);
        const check = await github.checks.get({
            check_run_id: getFromContext<{ id: number }>("check", context).id,
            owner: push.repo.owner,
            repo: push.repo.name,
        });

        let data = getFromContext<ComplicanceData>("compliance", context);
        if (!data) {
            data = {
                policies: [],
                differences: [],
                url: check.data.html_url,
            };
        }
        data.policies.push(...targets.map(t => JSON.parse(t.value)));
        data.differences.push(...discrepancies.map(d => d.diff.to));
        storeInContext<ComplicanceData>("compliance", data, context);

        if (discrepancies.length === 0) {
            return [];
        }

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

${targetCount} ${targetCount === 1 ? "Policy" : "Polices"} set - Compliance ${((1 - (discrepancies.length / targetCount)) * 100).toFixed(0)}% - [Manage](https://app.atomist.com/workspace/${context.workspaceId}/analysis/manage?category=${encodeURIComponent(getCategories(aspect)[0])}&aspect=${encodeURIComponent(aspect.displayName)})

${discrepancies.map(d => `* ${codeLine(displayName(aspect, d.diff.to))} at ${codeLine(displayValue(aspect, d.diff.to))} - Policy: ${codeLine(displayValue(aspect, d.target))} - [Manage](https://app.atomist.com/workspace/${context.workspaceId}/analysis/enable?fingerprint=${encodeURIComponent(d.diff.to.name)}&category=${encodeURIComponent(getCategories(aspect)[0])}&aspect=${encodeURIComponent(aspect.displayName)})`).join("\n")}`;
        output.text = `${output.text}\n\n${text}`;

        await github.checks.update({
            check_run_id: getFromContext<{ id: number }>("check", context).id,
            owner: push.repo.owner,
            repo: push.repo.name,
            output,
        });

        return [];
    };
}

export function checkGoalExecutionListener(complianceGoal: Goal): GoalExecutionListener {
    return async li => {
        const { credentials, goalEvent, context, id } = li;

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
                storeInContext<{ id: number }>("check", { id: checks.data.check_runs[0].id }, context);
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
                storeInContext<{ id: number }>("check", { id: check.data.id }, context);
            }
        } else {
            const check = await github.checks.get({
                check_run_id: getFromContext<{ id: number }>("check", context).id,
                owner: goalEvent.push.repo.owner,
                repo: goalEvent.push.repo.name,
            });
            const conclusion = !!check.data.output.title ? "action_required" : "success";
            await github.checks.update({
                check_run_id: getFromContext<{ id: number }>("check", context).id,
                owner: goalEvent.repo.owner,
                repo: goalEvent.repo.name,
                status: "completed",
                conclusion,
                output: conclusion === "success" ? {
                    title: "Policy differences",
                    summary: "No policy differences detected",
                } : undefined,
            });

            const cGoalEvent = await findSdmGoalOnCommit(context, id, goalEvent.push.repo.org.provider.providerId, complianceGoal);
            const data = getFromContext<ComplicanceData>("compliance", context);
            if (!!cGoalEvent && !!data) {
                await updateGoal(context, cGoalEvent, {
                    state: SdmGoalState.planned,
                    description: complianceGoal.plannedDescription,
                    data: JSON.stringify(data),
                });
            }
        }
    };
}

function storeInContext<T>(key: string, obj: T, context: any): void {
    context[key] = obj;
}

function getFromContext<T>(key: string, context: any): T {
    return context[key] as T;
}
