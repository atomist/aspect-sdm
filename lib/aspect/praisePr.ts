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
    HttpMethod,
    TokenCredentials,
} from "@atomist/automation-client";
import { lookupChatTeam } from "@atomist/automation-client/lib/spi/message/MessageClientSupport";
import {
    createJob,
    PreferenceScope,
    PushImpactListenerInvocation,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { getCategories } from "@atomist/sdm-pack-aspect/lib/customize/categories";
import { toName } from "@atomist/sdm-pack-fingerprints/lib/adhoc/preferences";
import {
    ApplyAllFingerprintsName,
    ApplyTargetFingerprintsParameters,
} from "@atomist/sdm-pack-fingerprints/lib/handlers/commands/applyFingerprint";
import {
    Aspect,
    FingerprintDiffHandler,
    FP,
} from "@atomist/sdm-pack-fingerprints/lib/machine/Aspect";
import { displayName } from "@atomist/sdm-pack-fingerprints/lib/machine/Aspects";
import {
    applyFingerprintTitle,
    prBodyFromFingerprint,
} from "@atomist/sdm-pack-fingerprints/lib/support/messages";
import {
    bold,
    codeLine,
    italic,
} from "@atomist/slack-messages";
import has = Reflect.has;

/**
 * Fingerprint diff handler that raises a PR for all policy discrepancies
 *
 * Supports opt-out behavior for org and repo level configuration. In case
 * opt-out is configured, the provided fallback handler will be invoked.
 */
export function raisePrDiffHandler(sdm: SoftwareDeliveryMachine,
                                   fallback: FingerprintDiffHandler = async () => []): FingerprintDiffHandler {
    return async (pli, diffs, aspect) => {
        const repo = pli.push.repo;

        // We only auto raise PRs against the default branch or when there are no channels mapped
        if (repo.defaultBranch !== pli.push.branch) {
            return fallback(pli, diffs, aspect);
        }

        // Find all policy discrepancies
        const discrepancies: Array<FP<any>> = [];
        for (const diff of diffs) {
            const target = diff.targets.TeamConfiguration.find(tc => tc.name === toName(diff.to.type, diff.to.name));
            if (!!target) {
                const targetFp = JSON.parse(target.value);
                if (targetFp.sha !== diff.to.sha) {
                    discrepancies.push(targetFp);
                }
            }
        }

        if (discrepancies.length === 0) {
            // close PR
            const url = `https://api.github.com/repos/${repo.owner}/${repo.name}`;
            const client = pli.configuration.http.client.factory.create(url);
            const config = {
                headers: {
                    Authorization: `token ${(pli.credentials as TokenCredentials).token}`,
                },
            };
            const prs = await client.exchange<Array<{ number: string }>>(
                `${url}/pulls?state=open&head=${repo.owner}:atomist/${aspect.name}/${pli.push.branch}`,
                {
                    method: HttpMethod.Get,
                    ...config,
                });

            if (prs.body.length > 0) {
                for (const pr of prs.body) {
                    await client.exchange(
                        `${url}/pulls/${pr.number}`,
                        {
                            method: HttpMethod.Patch,
                            body: { state: "closed" },
                            ...config,
                        });

                    await client.exchange(
                        `${url}/git/refs/heads/atomist/${aspect.name}/${pli.push.branch}`,
                        {
                            method: HttpMethod.Delete,
                            ...config,
                        });

                    await client.exchange(
                        `${url}/issues/${pr.number}/comments`,
                        {
                            method: HttpMethod.Post,
                            body: { body: `PR closed because all polices of ${italic(aspect.displayName)} have been applied to branch ${codeLine(pli.push.branch)}` },
                            ...config,
                        });
                }
            }
            return [];
        }

        if (!!repo.channels && repo.channels.length > 0) {
            return fallback(pli, diffs, aspect);
        }

        // Check Org and repo preference
        const disabledForOrg = await pli.preferences.get<{ disabled: boolean }>(raisePrPreferenceKey(repo.owner), {
            scope: PreferenceScope.Sdm,
            defaultValue: { disabled: false },
        });
        const disabledForRepo = await pli.preferences.get<{ disabled: boolean }>(raisePrPreferenceKey(repo.owner), {
            scope: PreferenceScope.Sdm,
            defaultValue: { disabled: false },
        });

        // Fallback to the fallback diff handler if this one is disabled for org or repo
        if (disabledForOrg.disabled || disabledForRepo.disabled) {
            return fallback(pli, diffs, aspect);
        }

        const description = discrepancies.length === 1 ?
            applyFingerprintTitle(discrepancies[0], [aspect]) :
            `Applying ${discrepancies.length} ${discrepancies.length === 1 ? "policy" : "policies"} for ${
                aspect.name} to ${repo.owner} /${repo.name}/${pli.push.branch}`;

        const title = discrepancies.length === 1 ?
            applyFingerprintTitle(discrepancies[0], [aspect]) :
            `Apply all of ${discrepancies.map(d => displayName(aspect, d)).join(", ")}`;

        // Schedule job to raise PR
        await createJob<ApplyTargetFingerprintsParameters>({
            command: ApplyAllFingerprintsName,
            description,
            name: `ApplyPolicy/${discrepancies.map(d => toName(d.type, d.name)).join(",")}`,
            parameters: {
                title,
                body: addCommandsToPrBody(
                    discrepancies.map(v => prBodyFromFingerprint(v, [aspect])).join("\n---\n"),
                    pli.context.workspaceId,
                    await hasChatTeam(pli),
                    repo,
                    aspect,
                    discrepancies[0]),
                branch: pli.push.branch,
                fingerprints: discrepancies.map(d => toName(d.type, d.name)).join(","),
                targets: {
                    owner: repo.owner,
                    repo: repo.name,
                    branch: pli.push.branch,
                },
            },
            concurrentTasks: 1,
        }, pli.context);

        // Return no further votes
        return [];
    };
}

export function raisePrPreferenceKey(org: string, repo?: string): string {
    if (!repo) {
        return `atomist.com/fingerprint/raisePr/${org}`;
    } else {
        return `atomist.com/fingerprint/raisePr/${org}/${repo}`;
    }
}

async function hasChatTeam(pli: PushImpactListenerInvocation): Promise<boolean> {
    let hct = false;
    try {
        await lookupChatTeam(pli.context.graphClient);
        hct = true;
    } catch (e) {
        // Ignore
    }
    return hct;
}

function addCommandsToPrBody(body: string,
                             workspaceId: string,
                             hct: boolean,
                             repo: { owner?: string, name?: string },
                             aspect: Aspect,
                             fp: FP<any>): string {
    return `${body}

---
<details>
<summary>Commands</summary>
<br/>

You can trigger Atomist commands by commenting on this PR:
- \`@atomist opt-out\` will stop raising policy PRs for this repository

${!hct ? `[Connect your Atomist workspace to Slack](https://app.atomist.com/workspace/${workspaceId}/analysis/chatops?aspect=${encodeURIComponent(aspect.displayName)}&category=${encodeURIComponent(getCategories(aspect)[0])}&fingerprint=${encodeURIComponent(fp.name)}) to manage these updates directly from Slack.`
        : `[Link this repository to a Slack channel](https://app.atomist.com/workspace/${workspaceId}/settings/integrations/slack?repo=${encodeURIComponent(`${repo.owner}/${repo.name}`)} to manage these updates directly from Slack.`}

</details>`;
}
