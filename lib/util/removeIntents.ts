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

import { Configuration } from "@atomist/automation-client";
import { isCommandHandlerMetadata } from "@atomist/automation-client/lib/internal/metadata/metadata";
import { CommandHandlerMetadata } from "@atomist/automation-client/lib/metadata/automationMetadata";
import { AutomationMetadataProcessor } from "@atomist/automation-client/lib/spi/env/MetadataProcessor";

const CommandWhitelist = [
    "SelfDescribe",
    "CreateFingerprintJobCommand",
];

export class RemoveIntentsMetadataProcessor implements AutomationMetadataProcessor {

    public process<CommandHandlerMetadata>(metadata: CommandHandlerMetadata, configuration: Configuration): CommandHandlerMetadata {
        if (isCommandHandlerMetadata(metadata)) {
            if (!CommandWhitelist.includes(metadata.name)) {
                metadata.intent = [];
            }
        }
        return metadata;
    }
}
