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
    HandlerContext,
    HttpMethod,
    QueryNoCacheOptions,
    TokenCredentials,
} from "@atomist/automation-client";
import {
    Aspect,
    FP,
} from "@atomist/sdm-pack-fingerprint";
import { AspectsFactory } from "@atomist/sdm-pack-fingerprint/lib/machine/fingerprintSupport";
import {
    AspectRegistrations,
    AspectRegistrationState,
} from "../typings/types";

export interface AspectRequest {
    configuration: {
        github: {
            token: string;
        };
    };
    repo: { owner: string, name: string, providerId: string, apiUrl: string, defaultBranch: string };
    branch: string;
    commit: { sha: string, message: string };
}

export async function getAspectRegistrations(ctx: HandlerContext, name?: string): Promise<AspectRegistrations.AspectRegistration[]> {
    const aspects = (await ctx.graphClient.query<AspectRegistrations.Query, AspectRegistrations.Variables>({
        name: "AspectRegistrations",
        variables: {
            name: !!name ? [name] : undefined,
        },
        options: QueryNoCacheOptions,
    }));
    return !!aspects ? aspects.AspectRegistration : [];
}

export const RegistrationsBackedAspectsFactory: AspectsFactory = async (p, pli) => {
    return (await getAspectRegistrations(pli.context)).filter(a => a.state === AspectRegistrationState.Enabled && !!a.endpoint).map(createAspectProxy);
};

function createAspectProxy(reg: AspectRegistrations.AspectRegistration): Aspect {
    return {
        name: reg.name,
        displayName: reg.displayName,
        extract: async (p, papi) => {

            if (!reg.endpoint) {
                return [];
            }

            const payload: AspectRequest = {
                configuration: {
                    github: {
                        token: (papi.credentials as TokenCredentials).token,
                    },
                },
                repo: {
                    owner: p.id.owner,
                    name: p.id.repo,
                    providerId: papi.push.repo.org.provider.providerId,
                    apiUrl: papi.push.repo.org.provider.apiUrl,
                    defaultBranch: papi.push.repo.defaultBranch,
                },
                branch: papi.push.branch,
                commit: {
                    sha: papi.push.after.sha,
                    message: papi.push.after.message,
                },
            };
            const url = `${reg.endpoint}/extract/${papi.context.workspaceId}/${encodeURIComponent(reg.name)}`;
            const client = papi.configuration.http.client.factory.create(url);
            try {
                return (await client.exchange<FP[]>(url, {
                    method: HttpMethod.Put,
                    body: payload,
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                })).body.map(f => {
                    const data = {
                        ...(typeof f.data === "string" ? JSON.parse(f.data) : f.data),
                        displayValue: (f as any).displayValue,
                        displayName: (f as any).displayName,
                    };
                    return {
                        ...f,
                        type: reg.name,
                        data,
                    };
                });
            } catch (e) {
                return [];
            }
        },
        toDisplayableFingerprint: fp => fp.data.displayValue,
        toDisplayableFingerprintName: () => reg.displayName,
    };

}
