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
    AutomationClient,
    AutomationContextAware,
    AutomationEventListenerSupport,
    EventFired,
    HandlerContext,
    HandlerResult,
} from "@atomist/automation-client";
import {
    defaultStatsDClientOptions,
    StatsDClient,
} from "@atomist/automation-client/lib/spi/statsd/statsdClient";
import * as cluster from "cluster";

export class ExecuteTaskMetricReportingAutomationEventListener extends AutomationEventListenerSupport {

    private statsd: StatsDClient;

    public async startupSuccessful(client: AutomationClient): Promise<void> {
        if (cluster.isWorker && client.configuration.statsd.enabled) {
            this.statsd = client.configuration.statsd.client.factory.create(
                defaultStatsDClientOptions(client.configuration));
        }
    }

    public async eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): Promise<void> {
        if (cluster.isWorker && !!this.statsd && payload.extensions.operationName === "ExecuteTask") {
            const start = (ctx as any as AutomationContextAware).context.ts;

            this.statsd.increment(
                `counter.execute_task`,
                1,
                1,
                {},
                () => {
                    /* intentionally left empty */
                });
            this.statsd.timing(
                "timer.execute_task",
                Date.now() - start,
                1,
                {},
                () => {
                    /* intentionally left empty */
                });
        }
    }
}
