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

import { reviewerAspects } from "@atomist/sdm-pack-aspect/lib/aspect/common/reviewerAspect";
import {
    HardcodedPropertyReviewer,
    ImportDotStar,
    ImportDotStarReviewer,
    ImportIoFile,
    ImportIoFileReviewer,
    MutableInjectionsReviewer,
    NonSpecificMvcAnnotationsReviewer,
} from "@atomist/sdm-pack-spring";

export const FileIoUsage = reviewerAspects({
    name: "file-io",
    displayName: ImportIoFile,
    reviewer: ImportIoFileReviewer,
});

export const DotStarUsage = reviewerAspects({
    name: "import-dot-star",
    displayName: ImportDotStar,
    reviewer: ImportDotStarReviewer,
});

export const MutableInjections = reviewerAspects({
    name: "mutable-injection",
    displayName: "mutable injection",
    reviewer: MutableInjectionsReviewer,
});

export const HardCodedProperty = reviewerAspects({
    name: "hard-coded-property",
    displayName: "hard code property",
    reviewer: HardcodedPropertyReviewer,
});

export const NonSpecificMvcAnnotation = reviewerAspects({
    name: "non-specific-mvc",
    displayName: "non specific MVC annotations",
    reviewer: NonSpecificMvcAnnotationsReviewer,
});
