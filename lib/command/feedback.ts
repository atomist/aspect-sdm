import { addressSlackChannels } from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
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

            await Promise.all(WORKSPACE_IDS.map(w => ci.context.messageClient.send(msg, addressSlackChannels(w, "support"), { dashboard: false })));
        }
        await ci.addressChannels("Thanks for your message. We'll get right back!");
    },
};
