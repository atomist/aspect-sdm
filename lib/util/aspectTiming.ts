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
