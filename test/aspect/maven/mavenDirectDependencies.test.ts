import {
    InMemoryProject,
    Project,
} from "@atomist/automation-client";
import { InMemoryFile } from "@atomist/automation-client/lib/project/mem/InMemoryFile";
import * as assert from "power-assert";
import { MavenDirectDependencies } from "../../../lib/aspect/maven/mavenDirectDependencies";

describe("mavenDirectDependencies", () => {

    describe("apply", () => {

        it("should correctly update dependency with version to new version", async () => {
                const pom = `<?xml version="1.0" encoding="UTF-8"?>
<project>
   <modelVersion>4.0.0</modelVersion>
   <groupId>atomist</groupId> 
   <artifactId>cd41</artifactId>
   <version>0.1.0-SNAPSHOT</version>
   <packaging>jar</packaging> 
   <name>cd41</name>  
   <dependencies>
      <dependency>
         <groupId>com.atomist</groupId>
         <artifactId>spring-boot-agent</artifactId>
         <version>[2.0.0,3.0.0)</version>
      </dependency>
   </dependencies>
</project>`;

                const p = InMemoryProject.of(new InMemoryFile("pom.xml", pom));
                const np = await MavenDirectDependencies.apply(p, {
                    parameters: {
                        fp: {
                            data: {
                                group: "com.atomist",
                                artifact: "spring-boot-agent",
                                version: "1.0.0",
                            },
                        },
                    },
                } as any) as Project;

                const pf = await np.getFile("pom.xml");
                assert(pf.getContentSync().includes("<version>1.0.0</version>"));
            },
        );
        it("should correctly update dependency with version to managed", async () => {
            const pom = `<?xml version="1.0" encoding="UTF-8"?>
<project>
   <modelVersion>4.0.0</modelVersion>
   <groupId>atomist</groupId> 
   <artifactId>cd41</artifactId>
   <version>0.1.0-SNAPSHOT</version>
   <packaging>jar</packaging> 
   <name>cd41</name>  
   <dependencies>
      <dependency>
         <groupId>com.atomist</groupId>
         <artifactId>spring-boot-agent</artifactId>
         <version>[2.0.0,3.0.0)</version>
         <scope>test</scope>
      </dependency>
   </dependencies>
</project>`;

            const p = InMemoryProject.of(new InMemoryFile("pom.xml", pom));
            const np = await MavenDirectDependencies.apply(p, {
                parameters: {
                    fp: {
                        data: {
                            group: "com.atomist",
                            artifact: "spring-boot-agent",
                            version: "managed",
                        },
                    },
                },
            } as any) as Project;

            const pf = await np.getFile("pom.xml");

            const epom = `<?xml version="1.0" encoding="UTF-8"?>
<project>
   <modelVersion>4.0.0</modelVersion>
   <groupId>atomist</groupId> 
   <artifactId>cd41</artifactId>
   <version>0.1.0-SNAPSHOT</version>
   <packaging>jar</packaging> 
   <name>cd41</name>  
   <dependencies>
      <dependency>
         <groupId>com.atomist</groupId>
         <artifactId>spring-boot-agent</artifactId>
         <scope>test</scope>
      </dependency>
   </dependencies>
</project>`;
            assert.deepStrictEqual(pf.getContentSync(), epom);
        });

        it("should correctly update dependency no version to new version", async () => {
            const pom = `<?xml version="1.0" encoding="UTF-8"?>
<project>
   <modelVersion>4.0.0</modelVersion>
   <groupId>atomist</groupId> 
   <artifactId>cd41</artifactId>
   <version>0.1.0-SNAPSHOT</version>
   <packaging>jar</packaging> 
   <name>cd41</name>  
   <dependencies>
      <dependency>
         <groupId>com.atomist</groupId>
         <artifactId>spring-boot-agent</artifactId>
         <scope>test</scope>
      </dependency>
   </dependencies>
</project>`;

            const p = InMemoryProject.of(new InMemoryFile("pom.xml", pom));
            const np = await MavenDirectDependencies.apply(p, {
                parameters: {
                    fp: {
                        data: {
                            group: "com.atomist",
                            artifact: "spring-boot-agent",
                            version: "1.0.0",
                        },
                    },
                },
            } as any) as Project;

            const pf = await np.getFile("pom.xml");

            const epom = `<?xml version="1.0" encoding="UTF-8"?>
<project>
   <modelVersion>4.0.0</modelVersion>
   <groupId>atomist</groupId> 
   <artifactId>cd41</artifactId>
   <version>0.1.0-SNAPSHOT</version>
   <packaging>jar</packaging> 
   <name>cd41</name>  
   <dependencies>
      <dependency>
         <groupId>com.atomist</groupId>
         <artifactId>spring-boot-agent</artifactId>
         <version>1.0.0</version>
         <scope>test</scope>
      </dependency>
   </dependencies>
</project>`;
            assert.deepStrictEqual(pf.getContentSync(), epom);

        });

    });

});
