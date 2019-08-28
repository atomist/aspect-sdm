import { Configuration } from "@atomist/automation-client";
import { isCommandHandlerMetadata } from "@atomist/automation-client/lib/internal/metadata/metadata";
import { CommandHandlerMetadata } from "@atomist/automation-client/lib/metadata/automationMetadata";
import { AutomationMetadataProcessor } from "@atomist/automation-client/lib/spi/env/MetadataProcessor";

const CommandWhitelist = [
    "SelfDescribe",
];

export class RemoveIntentsMetadataProcessor implements AutomationMetadataProcessor {

    public process<CommandHandlerMetadata>(metadata: CommandHandlerMetadata, configuration: Configuration): CommandHandlerMetadata {
        if (isCommandHandlerMetadata(metadata)) {
            if (!CommandWhitelist.includes(metadata.name)) {
                metadata.intent = undefined;
            }
        }
        return metadata;
    }
}
