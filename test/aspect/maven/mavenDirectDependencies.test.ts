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

import {
    InMemoryProject,
    Project,
} from "@atomist/automation-client";
import { InMemoryFile } from "@atomist/automation-client/lib/project/mem/InMemoryFile";
import { FP } from "@atomist/sdm-pack-fingerprint";
import { VersionedArtifact } from "@atomist/sdm-pack-spring";
import * as assert from "power-assert";
import { MavenDirectDependencies } from "../../../lib/aspect/maven/mavenDirectDependencies";

const artifactFirst = `<?xml version="1.0" encoding="UTF-8"?>
<project>
   <modelVersion>4.0.0</modelVersion>
   <groupId>atomist</groupId>
   <artifactId>cd41</artifactId>
   <version>0.1.0-SNAPSHOT</version>
   <packaging>jar</packaging>
   <name>cd41</name>
   <dependencies>
      <dependency>
         <artifactId>spring-boot-agent</artifactId>
         <groupId>com.atomist</groupId>
         <version>[2.0.0,3.0.0)</version>
      </dependency>
   </dependencies>
</project>`;

const groupFirst = `<?xml version="1.0" encoding="UTF-8"?>
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

describe("mavenDirectDependencies", () => {

    describe("extract", () => {

        it("should cope with group id before artifact", async () => {
            const deps = await MavenDirectDependencies.extract(InMemoryProject.of({path: "pom.xml", content: groupFirst}), undefined) as Array<FP<VersionedArtifact>>;
            assert.strictEqual(1, deps.length);
            validate(deps[0].data);
        });

        it("should cope with artifact id before groupId", async () => {
            const deps = await MavenDirectDependencies.extract(InMemoryProject.of({path: "pom.xml", content: artifactFirst}), undefined) as Array<FP<VersionedArtifact>>;
            assert.strictEqual(1, deps.length);
            validate(deps[0].data);
        });

        function validate(dep: VersionedArtifact): void {
            assert.strictEqual(dep.artifact, "spring-boot-agent");
            assert.strictEqual(dep.group, "com.atomist");
        }

    });

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
                const result = pf.getContentSync();
                assert(result.includes("<version>1.0.0</version>"),
                    result);
            },
        );

        it("should correctly update dependency with version to new version with artifact before group", async () => {
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
         <artifactId>spring-boot-agent</artifactId>
         <groupId>com.atomist</groupId>
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

        it("should correctly update dependency with no version to new version", async () => {
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

        it("should correctly update dependency no version to new version - #4", async () => {
            const pom = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.atomist</groupId>
    <artifactId>spring-rest-seed</artifactId>
    <version>0.1.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <name>spring-rest-seed</name>
    <description>Atomist seed for Java Spring Boot REST services</description>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.0.6.RELEASE</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>

    <properties>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <project.reporting.outputEncoding>UTF-8</project.reporting.outputEncoding>
        <java.version>1.8</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>com.atomist</groupId>
            <artifactId>spring-boot-agent</artifactId>
            <version>[2.0.0,3.0.0)</version>
            <type>pom</type>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.hamcrest</groupId>
            <artifactId>hamcrest-library</artifactId>
            <version>1.3</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <finalName>springrest001</finalName>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>

    <repositories>
        <repository>
            <snapshots>
                <enabled>false</enabled>
            </snapshots>
            <id>bintray-atomist-atomist</id>
            <name>bintray</name>
            <url>https://dl.bintray.com/atomist/atomist</url>
        </repository>
    </repositories>

</project>`;

            const p = InMemoryProject.of(new InMemoryFile("pom.xml", pom));
            const np = await MavenDirectDependencies.apply(p, {
                parameters: {
                    fp: {
                        data: {
                            group: "org.springframework.boot",
                            artifact: "spring-boot-starter-web",
                            version: "2.1.3.RELEASE",
                        },
                    },
                },
            } as any) as Project;

            const pf = await np.getFile("pom.xml");

            const epom = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.atomist</groupId>
    <artifactId>spring-rest-seed</artifactId>
    <version>0.1.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <name>spring-rest-seed</name>
    <description>Atomist seed for Java Spring Boot REST services</description>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.0.6.RELEASE</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>

    <properties>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <project.reporting.outputEncoding>UTF-8</project.reporting.outputEncoding>
        <java.version>1.8</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>2.1.3.RELEASE</version>
        </dependency>
        <dependency>
            <groupId>com.atomist</groupId>
            <artifactId>spring-boot-agent</artifactId>
            <version>[2.0.0,3.0.0)</version>
            <type>pom</type>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.hamcrest</groupId>
            <artifactId>hamcrest-library</artifactId>
            <version>1.3</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <finalName>springrest001</finalName>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>

    <repositories>
        <repository>
            <snapshots>
                <enabled>false</enabled>
            </snapshots>
            <id>bintray-atomist-atomist</id>
            <name>bintray</name>
            <url>https://dl.bintray.com/atomist/atomist</url>
        </repository>
    </repositories>

</project>`;
            assert.deepStrictEqual(pf.getContentSync(), epom);
        });

    });

});
