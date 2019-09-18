import { reviewerAspect } from "@atomist/sdm-pack-aspect/lib/aspect/common/reviewerAspect";
import {
    HardcodedPropertyReviewer,
    ImportDotStar,
    ImportDotStarReviewer,
    ImportIoFile,
    ImportIoFileReviewer,
    MutableInjectionsReviewer, NonSpecificMvcAnnotationsReviewer
} from "@atomist/sdm-pack-spring";

export const FileIoUsage = reviewerAspect({
    name: "file-io",
    displayName: ImportIoFile,
    reviewer: ImportIoFileReviewer,
});

export const DotStarUsage = reviewerAspect({
    name: "import-dot-star",
    displayName: ImportDotStar,
    reviewer: ImportDotStarReviewer,
});

export const MutableInjections = reviewerAspect({
    name: "mutable-injection",
    displayName: "mutable injection",
    reviewer: MutableInjectionsReviewer,
});

export const HardCodedProperty = reviewerAspect({
    name: "hard-coded-property",
    displayName: "hard code property",
    reviewer: HardcodedPropertyReviewer,
});

export const NonSpecificMvcAnnotation = reviewerAspect({
    name: "non-specific-mvc",
    displayName: "non specific MVC annotations",
    reviewer: NonSpecificMvcAnnotationsReviewer,
});
