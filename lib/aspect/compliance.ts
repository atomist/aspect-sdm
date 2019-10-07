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

import { addressEvent } from "@atomist/automation-client";
import {
    GoalExecutionListener,
    SdmGoalState,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { toName } from "@atomist/sdm-pack-fingerprint/lib/adhoc/preferences";
import {
    Diff,
    FingerprintDiffHandler,
    FP,
} from "@atomist/sdm-pack-fingerprint/lib/machine/Aspect";
import {
    displayName,
    displayValue,
} from "@atomist/sdm-pack-fingerprint/lib/machine/Aspects";
import { ComplianceData } from "../goal/compliance";

export function complianceDiffHandler(sdm: SoftwareDeliveryMachine): FingerprintDiffHandler {
    return async (pli, diffs, aspect) => {
        const { context, push } = pli;

        // Find all policy discrepancies
        const discrepancies: Array<{ diff: Diff, target: FP<any> }> = [];
        const targets = [];
        for (const diff of diffs) {
            const target = diff.targets.TeamConfiguration.find(tc => tc.name === toName(diff.to.type, diff.to.name));
            if (!!target) {
                targets.push(target);
                const targetFp = JSON.parse(target.value);
                if (targetFp.sha !== diff.to.sha) {
                    discrepancies.push({ diff, target: targetFp });
                }
            }
        }

        let data = getFromContext<ComplianceData>("compliance", context);
        if (!data) {
            data = {
                owner: sdm.configuration.name,
                state: "created",
                _branch: push.branch,
                _sha: push.after.sha,
                _owner: push.repo.owner,
                _repo: push.repo.name,
                targets: [],
                differences: [],
                aspects: [],
                ts: Date.now(),
            };
        }
        data.targets.push(...targets.map(t => {
            const fp = JSON.parse(t.value) as FP<any>;
            return {
                type: fp.type,
                name: fp.name,
                sha: fp.sha,
                data: JSON.stringify(fp.data),

                displayName: displayName(aspect, fp),
                displayValue: displayValue(aspect, fp),
                displayType: aspect.displayName,
            };
        }));
        data.differences.push(...discrepancies.map(d => {
            const fp = d.diff.to;
            return {
                type: fp.type,
                name: fp.name,
                sha: fp.sha,
                data: JSON.stringify(fp.data),

                displayName: displayName(aspect, fp),
                displayValue: displayValue(aspect, fp),

                aspectName: aspect.displayName,
            };
        }));
        data.aspects.push({
            type: aspect.name,
            displayType: aspect.displayName,
        });

        storeInContext<ComplianceData>("compliance", data, context);
        return [];
    };
}

export function complianceGoalExecutionListener(): GoalExecutionListener {
    return async li => {
        const { goalEvent, context } = li;

        if (goalEvent.state !== SdmGoalState.in_process) {
            const data = getFromContext<ComplianceData>("compliance", context);
            if (!!data) {
                await context.messageClient.send(data, addressEvent("PolicyCompliance"));
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
