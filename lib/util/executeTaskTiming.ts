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
