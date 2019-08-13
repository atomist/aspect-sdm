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
    HttpClientFactory,
    logger,
} from "@atomist/automation-client";
import { ExpressCustomizer } from "@atomist/automation-client/lib/configuration";
import {
    ConcreteIdeal,
    FP,
    Ideal,
    isConcreteIdeal,
} from "@atomist/sdm-pack-fingerprints";
import * as bodyParser from "body-parser";
import {
    Express,
    RequestHandler,
} from "express";
import * as _ from "lodash";
import { CSSProperties } from "react";
import serveStatic = require("serve-static");
import {
    ProjectAspectForDisplay,
    ProjectFingerprintForDisplay,
    RepoExplorer,
} from "../../../views/repository";
import {
    CurrentIdealForDisplay,
    PossibleIdealForDisplay,
    SunburstPage,
} from "../../../views/sunburstPage";
import { renderStaticReactNode } from "../../../views/topLevelPage";
import { ProjectAnalysisResultStore } from "../../analysis/offline/persist/ProjectAnalysisResultStore";
import {
    AspectRegistry,
    ManagedAspect,
} from "../../aspect/AspectRegistry";
import {
    defaultedToDisplayableFingerprint,
    defaultedToDisplayableFingerprintName,
} from "../../aspect/DefaultAspectRegistry";
import { CustomReporters } from "../../customize/customReporters";
import {
    describeSelectedTagsToAnimals,
    TagTree,
} from "../api";
import { exposeOverviewPage } from "./overviewPage";
import { exposeRepositoryListPage } from "./repositoryListPage";

/**
 * Add the org page route to Atomist SDM Express server.
 * @return {ExpressCustomizer}
 */
export function addWebAppRoutes(
    aspectRegistry: AspectRegistry,
    store: ProjectAnalysisResultStore,
    httpClientFactory: HttpClientFactory): {
        customizer: ExpressCustomizer,
        routesToSuggestOnStartup: Array<{ title: string, route: string }>,
    } {
    const topLevelRoute = "/overview";
    return {
        routesToSuggestOnStartup: [{ title: "Atomist Visualizations", route: topLevelRoute }],
        customizer: (express: Express, ...handlers: RequestHandler[]) => {
            express.use(bodyParser.json());       // to support JSON-encoded bodies
            express.use(bodyParser.urlencoded({     // to support URL-encoded bodies
                extended: true,
            }));

            express.use(serveStatic("public", { index: false }));
            express.use(serveStatic("dist", { index: false }));

            /* redirect / to the org page. This way we can go right here
             * for now, and later make a higher-level page if we want.
             */
            express.get("/", ...handlers, async (req, res) => {
                res.redirect(topLevelRoute);
            });

            exposeDriftPage(express, handlers, httpClientFactory, aspectRegistry);
            exposeOverviewPage(express, handlers, topLevelRoute, aspectRegistry, store);
            exposeRepositoryListPage(express, handlers, aspectRegistry, store);
            exposeRepositoryPage(express, handlers, aspectRegistry, store);
            exposeExplorePage(express, handlers, httpClientFactory, aspectRegistry);
            exposeFingerprintReportPage(express, handlers, httpClientFactory, aspectRegistry);
            exposeCustomReportPage(express, handlers, httpClientFactory, aspectRegistry);
        },
    };
}

function exposeRepositoryPage(express: Express,
                              handlers: RequestHandler[],
                              aspectRegistry: AspectRegistry,
                              store: ProjectAnalysisResultStore): void {
    express.get("/repository", ...handlers, async (req, res) => {
        const workspaceId = req.query.workspaceId || "*";
        const id = req.query.id;
        const analysisResult = await store.loadById(id);
        if (!analysisResult) {
            return res.send(`No project at ${JSON.stringify(id)}`);
        }

        const aspectsAndFingerprints = await projectFingerprints(aspectRegistry, await store.fingerprintsForProject(id));

        // assign style based on ideal
        const ffd: ProjectAspectForDisplay[] = aspectsAndFingerprints.map(aspectAndFingerprints => ({
            ...aspectAndFingerprints,
            fingerprints: aspectAndFingerprints.fingerprints.map(fp => ({
                ...fp,
                idealDisplayString: displayIdeal(fp, aspectAndFingerprints.aspect),
                style: displayStyleAccordingToIdeal(fp),
            })),
        }));

        const repo = (await aspectRegistry.tagAndScoreRepos(workspaceId, [analysisResult]))[0];
        return res.send(renderStaticReactNode(
            RepoExplorer({
                repo,
                aspects: _.sortBy(ffd.filter(f => !!f.aspect.displayName), f => f.aspect.displayName),
            }), `${repo.analysis.id.owner} / ${repo.analysis.id.repo}`));
    });
}

function exposeExplorePage(express: Express,
                           handlers: RequestHandler[],
                           httpClientFactory: HttpClientFactory,
                           aspectRegistry: AspectRegistry): void {
    express.get("/explore", ...handlers, async (req, res) => {
        const tags = req.query.tags || "";
        const workspaceId = req.query.workspaceId || "*";
        const dataUrl = `/api/v1/${workspaceId}/explore?tags=${tags}`;
        const readable = describeSelectedTagsToAnimals(tags.split(","));
        return renderDataUrl(workspaceId, {
            dataUrl,
            title: `Repositories matching ${readable}`,
        },
            aspectRegistry, httpClientFactory, req, res);
    });
}

function exposeDriftPage(express: Express,
                         handlers: RequestHandler[],
                         httpClientFactory: HttpClientFactory,
                         aspectRegistry: AspectRegistry): void {
    express.get("/drift", ...handlers, async (req, res) => {
        const workspaceId = req.query.workspaceId || "*";
        const dataUrl = `/api/v1/${workspaceId}/drift` + (req.query.type ? `?type=${req.query.type}` : "");
        return renderDataUrl(workspaceId, {
            dataUrl,
            title: "Drift by aspect",
        }, aspectRegistry, httpClientFactory, req, res);
    });
}

function exposeFingerprintReportPage(express: Express,
                                     handlers: RequestHandler[],
                                     httpClientFactory: HttpClientFactory,
                                     aspectRegistry: AspectRegistry): void {
    express.get("/fingerprint/:type/:name", ...handlers, async (req, res) => {
        const type = req.params.type;
        const name = req.params.name;
        const workspaceId = req.query.workspaceId || "*";
        const dataUrl = `/api/v1/${workspaceId}/fingerprint/${
            encodeURIComponent(type)}/${
            encodeURIComponent(name)}?byOrg=${
            req.query.byOrg === "true"}&presence=${req.query.presence === "true"}&progress=${
            req.query.progress === "true"}&otherLabel=${req.query.otherLabel === "true"}&trim=${
            req.query.trim === "true"}`;
        return renderDataUrl(workspaceId, {
            dataUrl,
            title: `Atomist aspect ${type}/${name}`,
        }, aspectRegistry, httpClientFactory, req, res);
    });
}

function exposeCustomReportPage(express: Express,
                                handlers: RequestHandler[],
                                httpClientFactory: HttpClientFactory,
                                aspectRegistry: AspectRegistry): void {
    express.get("/report/:name", ...handlers, async (req, res) => {
        const name = req.params.name;
        const workspaceId = req.query.workspaceId || "*";
        const queryString = jsonToQueryString(req.query);
        const dataUrl = `/api/v1/${workspaceId}/report/${name}?${queryString}`;
        const reporter = CustomReporters[name];
        if (!reporter) {
            throw new Error(`No report named ${name}`);
        }
        return renderDataUrl(workspaceId, {
            dataUrl,
            title: reporter.summary,
        }, aspectRegistry, httpClientFactory, req, res);
    });
}

// TODO fix any
async function renderDataUrl(workspaceId: string,
                             page: {
        title: string,
        dataUrl: string,
    },
                             aspectRegistry: AspectRegistry,
                             httpClientFactory: HttpClientFactory,
                             req: any,
                             res: any): Promise<void> {
    let tree: TagTree;
    let currentIdealForDisplay: CurrentIdealForDisplay;
    const possibleIdealsForDisplay: PossibleIdealForDisplay[] = [];

    const fullUrl = `http://${req.get("host")}${page.dataUrl}`;
    try {
        const result = await httpClientFactory.create().exchange<TagTree>(fullUrl,
            {
                retry: { retries: 0 },
            });
        tree = result.body;
        logger.info("From %s, got %s", fullUrl, tree.circles.map(c => c.meaning));
    } catch (e) {
        logger.error(`Failure fetching sunburst data from ${fullUrl}: ` + e.message);
    }

    // tslint:disable-next-line
    const aspect = aspectRegistry.aspectOf(req.query.type);
    const fingerprintDisplayName = defaultedToDisplayableFingerprintName(aspect)(req.query.name);

    function idealDisplayValue(ideal: Ideal | undefined): CurrentIdealForDisplay | undefined {
        if (!ideal) {
            return undefined;
        }
        if (!isConcreteIdeal(ideal)) {
            return { displayValue: "eliminate" };
        }
        return { displayValue: defaultedToDisplayableFingerprint(aspect)(ideal.ideal) };
    }

    currentIdealForDisplay = idealDisplayValue(await aspectRegistry.idealStore
        .loadIdeal("local", req.query.type, req.query.name));

    logger.info("Data url=%s", page.dataUrl);

    res.send(renderStaticReactNode(
        SunburstPage({
            workspaceId,
            fingerprintDisplayName,
            currentIdeal: currentIdealForDisplay,
            possibleIdeals: possibleIdealsForDisplay,
            query: req.params.query,
            dataUrl: fullUrl,
            tree,
            selectedTags: req.query.tags ? req.query.tags.split(",") : [],
        }),
        page.title,
        [
            "/sunburstScript-bundle.js",
        ]));
}

export function jsonToQueryString(json: object): string {
    return Object.keys(json).map(key =>
        encodeURIComponent(key) + "=" + encodeURIComponent(json[key]),
    ).join("&");
}

function displayIdeal(fingerprint: AugmentedFingerprintForDisplay, aspect: ManagedAspect): string {
    if (idealIsDifferentFromActual(fingerprint)) {
        return defaultedToDisplayableFingerprint(aspect)((fingerprint.ideal as ConcreteIdeal).ideal);
    }
    if (idealIsElimination(fingerprint)) {
        return "eliminate";
    }
    return "";
}

function idealIsElimination(fingerprint: AugmentedFingerprintForDisplay): boolean {
    return fingerprint.ideal && !isConcreteIdeal(fingerprint.ideal);
}

function idealIsDifferentFromActual(fingerprint: AugmentedFingerprintForDisplay): boolean {
    return fingerprint.ideal && isConcreteIdeal(fingerprint.ideal) && fingerprint.ideal.ideal.sha !== fingerprint.sha;
}

function idealIsSameAsActual(fingerprint: AugmentedFingerprintForDisplay): boolean {
    return fingerprint.ideal && isConcreteIdeal(fingerprint.ideal) && fingerprint.ideal.ideal.sha === fingerprint.sha;
}

function displayStyleAccordingToIdeal(fingerprint: AugmentedFingerprintForDisplay): CSSProperties {
    const redStyle: CSSProperties = { color: "red" };
    const greenStyle: CSSProperties = { color: "green" };

    if (idealIsSameAsActual(fingerprint)) {
        return greenStyle;
    }
    if (idealIsDifferentFromActual(fingerprint)) {
        return redStyle;
    }
    if (idealIsElimination(fingerprint)) {
        return redStyle;
    }
    return {};
}

export type AugmentedFingerprintForDisplay =
    FP &
    Pick<ProjectFingerprintForDisplay, "displayValue" | "displayName"> & {
        ideal?: Ideal;
    };

export interface AugmentedAspectForDisplay {
    aspect: ManagedAspect;
    fingerprints: AugmentedFingerprintForDisplay[];
}

async function projectFingerprints(fm: AspectRegistry, allFingerprintsInOneProject: FP[]): Promise<AugmentedAspectForDisplay[]> {
    const result = [];
    for (const aspect of fm.aspects) {
        const originalFingerprints =
            _.sortBy(allFingerprintsInOneProject.filter(fp => aspect.name === (fp.type || fp.name)), fp => fp.name);
        if (originalFingerprints.length > 0) {
            const fingerprints: AugmentedFingerprintForDisplay[] = [];
            for (const fp of originalFingerprints) {
                fingerprints.push({
                    ...fp,
                    // ideal: await this.opts.idealResolver(fp.name),
                    displayValue: defaultedToDisplayableFingerprint(aspect)(fp),
                    displayName: defaultedToDisplayableFingerprintName(aspect)(fp.name),
                });
            }
            result.push({
                aspect,
                fingerprints,
            });
        }
    }
    return result;
}