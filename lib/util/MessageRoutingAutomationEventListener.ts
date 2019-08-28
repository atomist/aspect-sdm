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
    AutomationEventListenerSupport,
    CommandInvocation,
    HandlerContext,
    HandlerResult,
    MessageOptions,
} from "@atomist/automation-client";
import {
    slackFooter,
    slackSuccessMessage,
} from "@atomist/sdm";
import {
    codeBlock,
    italic,
} from "@atomist/slack-messages";
import * as cluster from "cluster";
import * as _ from "lodash";

export const WORKSPACE_IDS = ["T095SFFBK"];

export class MessageRoutingAutomationEventListener extends AutomationEventListenerSupport {

    public async commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<void> {
        if (cluster.isMaster) {
            return;
        }

        const msg = slackSuccessMessage(
            "Command Execution", `Command ${italic(payload.name)} executed successfully.
${!!payload.args && payload.args.length > 0 ? `
Parameters:
${codeBlock(_.uniq(payload.args.map(a => `${a.name}: ${a.value}`)).join("\n"))}` : ""}${!!payload.mappedParameters && payload.mappedParameters.length > 0 ? `
Mapped Parameters:
${codeBlock(_.uniq(payload.mappedParameters.map(a => `${a.name}: ${a.value}`)).join("\n"))}` : ""}`);

        msg.attachments[0].footer = `${slackFooter()} \u00B7 ${ctx.workspaceId} \u00B7 ${(ctx as any as AutomationContextAware).context.workspaceName}`;

        const options: MessageOptions = {
            ts: Date.now(),
            dashboard: false,
        };

        await Promise.all(WORKSPACE_IDS.map(id => ctx.messageClient.send(msg, addressSlackChannels(id, "support"), options)));
    }
}
