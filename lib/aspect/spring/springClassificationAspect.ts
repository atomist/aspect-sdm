import { Aspect } from "@atomist/sdm-pack-fingerprint";
import { projectClassificationAspect } from "@atomist/sdm-pack-aspect";
import { isSpringBootStarterFingerprint } from "./springBootStarter";
import { isXmlBeanDefinitionsFingerprint } from "./xmlBeans";

/**
 * Classification Spring projects
 * @type {ClassificationAspect}
 */
export const SpringClassificationAspect: Aspect = projectClassificationAspect(
    {
        name: "spring-boot-classification",
        // Deliberately don't display
        displayName: undefined,
        toDisplayableFingerprintName: () => "Spring classification",
    },
    {
        tags: "spring-security",
        reason: "has spring security",
        testFingerprints: async fps => fps.some(fp => isSpringBootStarterFingerprint(fp) && fp.data.artifact === "spring-boot-starter-security"),
    },
    {
        tags: "actuator",
        reason: "has spring boot actuator",
        testFingerprints: async fps => fps.some(fp => isSpringBootStarterFingerprint(fp) && fp.data.artifact === "spring-boot-starter-actuator"),
    },
    {
        tags: "spring-xml",
        reason: "uses spring XML",
        testFingerprints: async fps => fps.some(fp => isXmlBeanDefinitionsFingerprint(fp) && fp.data.matches.length > 0),
    },
);

