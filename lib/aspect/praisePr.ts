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
    createJob,
    PreferenceScope,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { toName } from "@atomist/sdm-pack-fingerprints/lib/adhoc/preferences";
import {
    ApplyAllFingerprintsName,
    ApplyTargetFingerprintsParameters,
} from "@atomist/sdm-pack-fingerprints/lib/handlers/commands/applyFingerprint";
import {
    FingerprintDiffHandler,
    FP,
} from "@atomist/sdm-pack-fingerprints/lib/machine/Aspect";
import {
    applyFingerprintTitle,
    prBodyFromFingerprint,
} from "@atomist/sdm-pack-fingerprints/lib/support/messages";

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
        } else if (!!repo.channels && repo.channels.length > 0) {
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

        // Find all policy discrepancies
        const discrepancies: Array<FP<any>> = [];
        for (const diff of diffs) {
            const target = diff.targets.TeamConfiguration.find(tc => tc.name === toName(diff.to.type, diff.to.name));
            if (!!target && JSON.parse(target.value).sha !== diff.to.sha) {
                discrepancies.push(diff.to);
            }
        }

        if (discrepancies.length === 0) {
            return [];
        }

        const description = discrepancies.length === 1 ?
            applyFingerprintTitle(discrepancies[0], [aspect]) :
            `Applying ${discrepancies.length} ${discrepancies.length === 1 ? "policy" : "policies"} for ${aspect.name} to ${repo.owner}/${repo.name}/${pli.push.branch}`;

        const title = discrepancies.length === 1 ?
            applyFingerprintTitle(discrepancies[0], [aspect]) :
            `Apply all of ${discrepancies.map(d => d.name).join(", ")}`;

        // Schedule job to raise PR
        await createJob<ApplyTargetFingerprintsParameters>({
            command: ApplyAllFingerprintsName,
            description,
            name: `ApplyPolicy/${discrepancies.map(d => toName(d.type, d.name)).join(",")}`,
            parameters: {
                title,
                body: addCommandsToPrBody(discrepancies.map(v => prBodyFromFingerprint(v, [aspect])).join("\n---\n")),
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

function addCommandsToPrBody(body: string): string {
    return `${body}

---
<details>
<summary>Commands</summary>
<br/>

You can trigger Atomist commands by commenting on this PR:
- \`@atomist opt-out org\` will stop raising policy PRs for the entire org
- \`@atomist opt-out repo\` will stop raising policy PRs for this repository

</details>`;
}
