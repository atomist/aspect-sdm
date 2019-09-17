import { globAspect } from "@atomist/sdm-pack-aspect";

/**
 * Fingerprint Spring bean definitions
 * @type {Aspect<GlobAspectData>}
 */
export const XmlBeanDefinitions = globAspect({
    name: "spring-beans",
    displayName: "XML bean definitions",
    glob: "**/*.xml",
    contentTest: content =>
        content.includes("http://www.springframework.org/") &&
        content.includes("<beans>"),
});
