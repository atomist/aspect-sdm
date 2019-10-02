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

import { projectClassificationAspect } from "@atomist/sdm-pack-aspect";
import { CountAspect } from "@atomist/sdm-pack-aspect/lib/aspect/compose/commonTypes";
import {
    Aspect,
    fingerprintOf,
    FP,
} from "@atomist/sdm-pack-fingerprint";
import {
    SpringBootAppClassAspectName,
    SpringBootAppData,
} from "./springBootApps";

export interface TwelveFactorsOptions {
    name: string;
}

export function twelveFactorsCountAspect(opts: TwelveFactorsOptions): CountAspect {
    const type = `count_${opts.name}`;
    return {
        name: type,
        displayName: opts.name,
        extract: async () => [],
        consolidate: async fps => {
            return fingerprintOf({
                type,
                data: undefined,
            });
        },
    };
}
export interface TwelveFactorElement {
    factor: string;
    fulfilled: boolean;
}

export const TwelveFactorSpringBootFingerprintName = "twelve-factor-spring-boot";
export const SingleProjectPerRepoFactor = "twelve-factor-spring-boot";

export const SingleProjectPerRepoAspect: Aspect<TwelveFactorElement> = {
    name: "twelve-factor-single-project-per-repo",
    displayName: "12-Factor: Single project per repo",
    extract: async () => [],
    consolidate: async fps => {
        const springBootAppClassFP = fps.filter(isSpringBootAppClassFingerprint);
        return fingerprintOf<TwelveFactorElement>({
            type: TwelveFactorSpringBootFingerprintName,
            data: {
                factor: SingleProjectPerRepoFactor,
                fulfilled: springBootAppClassFP.length === 1,
            },
        });
    },
};

export const TwelveFactorCountAspect: CountAspect = {
    name: "twelve-factor-count",
    displayName: "12 factor count",
    extract: async () => [],
    consolidate: async fps => fingerprintOf({
        type: "twelve-factor-count",
        data: { count: fps.filter(isTwelveFactorFingerprint).length },
    }),
};

export const TwelveFactorClassificationAspect = projectClassificationAspect({
    name: "twelve-factor-classification",
    displayName: "12 factor classification",
    toDisplayableFingerprintName: () => "12 Factor",
}, {
    tags: "single-project-per-repo",
    reason: "Single project found in repository",
    testFingerprints: async fps => {
        const singleProjectPerRepoFPs = fps.filter(fp => isTwelveFactorFingerprint(fp) && fp.data.factor === SingleProjectPerRepoFactor);
        return singleProjectPerRepoFPs.length === 1 && singleProjectPerRepoFPs[0].data.fulfilled;
    },
});

export function isSpringBootAppClassFingerprint(o: any): o is FP<SpringBootAppData> {
    return (!!o.type && o.type === SpringBootAppClassAspectName);
}

export function isTwelveFactorFingerprint(o: any): o is FP<TwelveFactorElement> {
    return (!!o.type && o.type === TwelveFactorSpringBootFingerprintName);
}

export const SpringBootTwelveFactors = [
    SingleProjectPerRepoAspect,
    TwelveFactorCountAspect,
    TwelveFactorClassificationAspect,
    ];
