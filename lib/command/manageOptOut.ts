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
import { raisePrPreferenceKey } from "../aspect/praisePr";

export const OptOutCommand: CommandHandlerRegistration<{ owner: string, repo: string }> = {
    name: "OptOutCommand",
    description: "Opt out of automatic policy PRs",
    intent: ["opt out", "opt-out"],
    parameters: {
        owner: { uri: MappedParameters.GitHubOwner, declarationType: DeclarationType.Mapped },
        repo: { uri: MappedParameters.GitHubRepository, declarationType: DeclarationType.Mapped, required: false },
    },
    listener: async ci => {
        await ci.preferences.put<{ disabled: boolean }>(
            raisePrPreferenceKey(ci.parameters.owner, ci.parameters.repo),
            { disabled: true },
            { scope: PreferenceScope.Sdm });
        await ci.addressChannels("Opted out of automatic policy PRs for this repository. To opt back in, run `@atomist opt-in`.");
    },
};

export const OptInCommand: CommandHandlerRegistration<{ owner: string, repo: string }> = {
    name: "OptInCommand",
    description: "Opt in of automatic policy PRs",
    intent: ["opt in", "opt-in"],
    parameters: {
        owner: { uri: MappedParameters.GitHubOwner, declarationType: DeclarationType.Mapped },
        repo: { uri: MappedParameters.GitHubRepository, declarationType: DeclarationType.Mapped, required: false },
    },
    listener: async ci => {
        await ci.preferences.delete(
            raisePrPreferenceKey(ci.parameters.owner, ci.parameters.repo),
            { scope: PreferenceScope.Sdm });
        await ci.addressChannels("Opted in to automatic policy PRs for this repository.");
    },
};
