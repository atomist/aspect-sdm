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

import { MappedParameters } from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    DeclarationType,
    PreferenceScope,
} from "@atomist/sdm";
import { codeLine } from "@atomist/slack-messages";
import {
    OptOutStatus,
    raisePrPreferenceKey,
} from "../aspect/praisePr";

export const OptOutCommand: CommandHandlerRegistration<{ owner: string, repo: string }> = {
    name: "OptOut",
    description: "Opt out of automatic target PRs",
    intent: ["opt out", "opt-out"],
    parameters: {
        owner: { uri: MappedParameters.GitHubOwner, declarationType: DeclarationType.Mapped },
        repo: { uri: MappedParameters.GitHubRepository, declarationType: DeclarationType.Mapped, required: false },
    },
    listener: async ci => {
        await ci.preferences.put<OptOutStatus>(
            raisePrPreferenceKey(ci.parameters.owner, ci.parameters.repo),
            { disabled: true },
            { scope: PreferenceScope.Sdm });
        await ci.addressChannels(`Opted out of automatic target PRs for this ${ci.parameters.repo ? "repository" : "organization"}. To opt back in, run ${codeLine("@atomist opt-in")}.`);
    },
};

export const OptInCommand: CommandHandlerRegistration<{ always?: boolean, owner: string, repo: string }> = {
    name: "OptIn",
    description: "Opt in to automatic target PRs",
    intent: ["opt in", "opt-in"],
    parameters: {
        always: { description: "Opt in to automatic PRs regardless of linked channels", required: false, type: "boolean" },
        owner: { uri: MappedParameters.GitHubOwner, declarationType: DeclarationType.Mapped },
        repo: { uri: MappedParameters.GitHubRepository, declarationType: DeclarationType.Mapped, required: false },
    },
    listener: async ci => {
        if (!!ci.parameters.always) {
            await ci.preferences.put<OptOutStatus>(
                raisePrPreferenceKey(ci.parameters.owner, ci.parameters.repo),
                { enabled: true },
                { scope: PreferenceScope.Sdm });
        } else {
            await ci.preferences.delete(
                raisePrPreferenceKey(ci.parameters.owner, ci.parameters.repo),
                { scope: PreferenceScope.Sdm });
        }
        await ci.addressChannels(`Opted in to automatic target PRs for this ${ci.parameters.repo ? "repository" : "organization"}.`);
    },
};
