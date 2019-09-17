import { CountAspect } from "@atomist/sdm-pack-aspect/lib/aspect/compose/commonTypes";

import * as _ from "lodash";
import { fingerprintOf } from "@atomist/sdm-pack-fingerprint";

export const VirtualProjectCountType = "virtual-project-count";

export const VirtualProjectCountAspect: CountAspect = {
    name: VirtualProjectCountType,
    displayName: "Number of virtual projects",
    extract: async () => [],
    consolidate: async fps => {
        const count = _.uniq(fps.map(fp => fp.path)).length;
        return fingerprintOf({
            type: VirtualProjectCountType,
            data: { count },
        });
    },
};
