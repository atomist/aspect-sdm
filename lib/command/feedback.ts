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
    addressSlackChannels,
    AutomationContextAware,
} from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    slackFooter,
    slackInfoMessage,
} from "@atomist/sdm";

export const WORKSPACE_IDS = ["T095SFFBK"];

export const FeedbackCommand: CommandHandlerRegistration<any> = {
    name: "FeedbackCommand",
    description: "Send feedback or help to Atomist",
    intent: ["feedback", "help"],
    listener: async ci => {
        if (!ci.configuration.endpoints.graphql.includes("staging")) {

            const body = ci.parameters["comment.command"];
            const owner = ci.parameters["comment.owner"];
            const repo = ci.parameters["comment.repo"];
            const issueNumber = ci.parameters["comment.issueNumber"];

            const msg = slackInfoMessage(
                "Policy Help/Feedback",
                `${body}

https://github.com/${owner}/${repo}/pull/${issueNumber}`);

            msg.attachments[0].footer = `${slackFooter()} \u00B7 ${ci.context.workspaceId} \u00B7 ${(ci.context as any as AutomationContextAware).context.workspaceName}`;

            await Promise.all(WORKSPACE_IDS.map(w => ci.context.messageClient.send(msg, addressSlackChannels(w, "support"), { dashboard: false })));
        }
        await ci.addressChannels("Thanks for your message. We'll get right back!");
    },
};
