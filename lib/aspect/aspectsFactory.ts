import {
    HandlerContext,
    HttpMethod,
    TokenCredentials,
} from "@atomist/automation-client";
import {
    registerCategories,
    registerReportDetails,
} from "@atomist/sdm-pack-aspect/lib/customize/categories";
import {
    Aspect,
    FP,
} from "@atomist/sdm-pack-fingerprints";
import { displayValue } from "@atomist/sdm-pack-fingerprints/lib/machine/Aspects";
import { AspectsFactory } from "@atomist/sdm-pack-fingerprints/lib/machine/fingerprintSupport";
import { AspectRegistrations } from "../typings/types";

export interface AspectRequest {
    method: "extract" | "apply";
    configuration: {
        apiKey: string;
        workspaceIds: string[];
    };
    repo: { owner: string, name: string, branch: string, providerId: string, apiUrl: string };
    token: string;
    commit: { sha: string, message: string };
}

export async function getAspectRegistrations(ctx: HandlerContext): Promise<AspectRegistrations.AspectRegistration[]> {
    return (await ctx.graphClient.query<AspectRegistrations.Query, AspectRegistrations.Variables>({
        name: "AspectRegistrations",
    })).AspectRegistration;
}

export const RegistrationsBackedAspectsFactory: AspectsFactory = async (p, pli) => {
    return (await getAspectRegistrations(pli.context)).map(createAspectProxy);
};

function createAspectProxy(reg: AspectRegistrations.AspectRegistration): Aspect {
    // TODO cd this can't work in practice but does now

    registerCategories(reg as any, reg.category);
    registerReportDetails(reg as any, {
        description: reg.description,
        shortName: reg.shortName,
        unit: reg.unit,
        url: reg.url,
        manage: true,
    });

    return {
        name: reg.name,
        displayName: reg.displayName,
        extract: async (p, papi) => {
            const payload: AspectRequest = {
                method: "extract",
                configuration: {
                    apiKey: papi.configuration.apiKey,
                    workspaceIds: [papi.context.workspaceId],
                },
                repo: {
                    owner: p.id.owner,
                    name: p.id.repo,
                    branch: p.id.branch,
                    providerId: papi.push.repo.org.provider.providerId,
                    apiUrl: papi.push.repo.org.provider.apiUrl,
                },
                token: (papi.credentials as TokenCredentials).token,
                commit: {
                    sha: papi.push.after.sha,
                    message: papi.push.after.message,
                },
            };

            const client = papi.configuration.http.client.factory.create(reg.endpoint);
            try {
                return (await client.exchange<FP[]>(reg.endpoint, {
                    method: HttpMethod.Post,
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
        toDisplayableFingerprint(fp: FP<any>): string {
            return fp.data.displayValue;
        },
        toDisplayableFingerprintName(fingerprintName: string): string {
            return reg.name;
        },
    };

}
