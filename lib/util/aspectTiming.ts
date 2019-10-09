import { defaultStatsDClientOptions } from "@atomist/automation-client/lib/spi/statsd/statsdClient";
import { SoftwareDeliveryMachine } from "@atomist/sdm";
import { Aspect } from "@atomist/sdm-pack-fingerprint";

/**
 * Wrap an aspect with some statsD statistics reporting
 */
export function wrapAspectWithTiming(sdm: SoftwareDeliveryMachine): (aspect: Aspect) => Aspect {
    if (sdm.configuration.statsd.enabled) {
        const statsd = sdm.configuration.statsd.client.factory.create(defaultStatsDClientOptions(sdm.configuration));
        return a => ({
            ...a,
            extract: (p, pli) => {
                const start = Date.now();
                try {
                    return a.extract(p, pli);
                } finally {
                    statsd.timing(
                        "timer.aspect.extract",
                        Date.now() - start,
                        1,
                        [`atomist_aspect:${a.name}`],
                        () => {
                            /* intentionally left empty */
                        });
                }
            },
        });
    } else {
        return a => a;
    }
}
