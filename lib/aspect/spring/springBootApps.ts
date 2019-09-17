import {
    Aspect,
    sha256,
} from "@atomist/sdm-pack-fingerprint";
import { SpringBootProjectStructure } from "@atomist/sdm-pack-spring";

export interface SpringBootAppData {
    applicationClassName: string;
    applicationClassPackage: string;
    multipleDeclarations: boolean;
}

const SpringBootAppClassAspectName = "spring-boot-app-class";

export const SpringBootAppClass: Aspect<SpringBootAppData> = {
    name: SpringBootAppClassAspectName,
    displayName: "Spring Boot application class",
    extract: async p => {
        try {
            const structure = await SpringBootProjectStructure.inferFromJavaOrKotlinSource(p);
            if (structure) {
                const data = {
                    applicationClassName: structure.applicationClass,
                    applicationClassPackage: structure.applicationPackage,
                    multipleDeclarations: false,
                };
                return {
                    name: SpringBootAppClassAspectName,
                    version: "1.0.0",
                    type: SpringBootAppClassAspectName,
                    data,
                    displayValue: `${structure.applicationPackage}.${structure.applicationClass}`,
                    displayName: "Spring Boot application class",
                    sha: sha256(data),
                };
            } else {
                return undefined;
            }
        } catch (e) {
            const data = {
                applicationClassName: undefined,
                applicationClassPackage: undefined,
                multipleDeclarations: true,
            };
            return {
                name: SpringBootAppClassAspectName,
                version: "1.0.0",
                type: SpringBootAppClassAspectName,
                data,
                displayValue: "Multiple",
                displayName: "Spring Boot application class",
                sha: sha256(data),
            };
        }
    },
};
