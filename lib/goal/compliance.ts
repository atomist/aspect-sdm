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
    Goal,
    goal,
    SdmGoalState,
} from "@atomist/sdm";
import { Aspect } from "@atomist/sdm-pack-fingerprints";
import {
    aspectOf,
    displayName,
    displayValue,
} from "@atomist/sdm-pack-fingerprints/lib/machine/Aspects";
import * as _ from "lodash";

export interface ComplicanceData {
    policies: Array<{
        type: string;
        name: string;
        sha: string;
        data: string;
    }>;
    differences: Array<{
        type: string;
        name: string;
        sha: string;
        data: string;
    }>;
    url: string;
}

export function complianceGoal(aspects: Aspect[]): Goal {
    return goal({
        uniqueName: "atomist#policy",
        displayName: "Policy Compliance",
        descriptions: {
            failed: "Policy differences detected",
            completed: "No policy differences",
        },
    }, async gi => {
        const { goalEvent } = gi;
        if (!!goalEvent.data) {
            const data = JSON.parse(goalEvent.data) as ComplicanceData;

            // Write to rolar log
            const rows = _.map(_.groupBy(data.differences, "type"), (v, k) => {
                const aspect = aspectOf({ type: k }, aspects);
                const targetCount = data.policies.filter(p => p.type === k).length;
                return `## ${aspectOf({ type: k }, aspects).displayName}

${targetCount} ${targetCount === 1 ? "Policy" : "Polices"} set - Compliance ${((1 - (v.length / targetCount)) * 100).toFixed(0)}%

${v.map(d => {
                    const target = data.policies.find(p => p.type === d.type && p.name === d.name);
                    return `* ${displayName(aspect, d)} at ${displayValue(aspect, d)} - Policy: ${displayValue(aspect, target)}`;
                }).join("\n")}`;
            });

            gi.progressLog.write(`Policy differences

The following differences from set policies have been detected:

${rows.join("\n\n")}`);

            return {
                description: `${data.differences.length} policy ${data.differences.length === 1 ? "difference" : "differences"}`,
                state: data.differences.length === 0 ? SdmGoalState.success : SdmGoalState.failure,
                phase: `Compliance ${((1 - (data.differences.length / data.policies.length)) * 100).toFixed(0)}%`,
                externalUrls: [{
                    label: "Details",
                    url: data.url,
                }],
            };
        }
        return {
            state: SdmGoalState.success,
        };
    });
}
