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

import { InMemoryProject } from "@atomist/automation-client";
import assert = require("power-assert");
import {
    applyDockerBaseFingerprint,
    dockerBaseFingerprint, DockerPathType, DockerPortsType, extractDockerPathFingerprint,
    extractDockerPortsFingerprint
} from "../../../lib/aspect/docker/docker";
import { FP } from "@atomist/sdm-pack-fingerprint";

const dummyDockerFile = `
FROM sforzando-dockerv2-local.jfrog.io/java-atomist:0.11.1-20181115141152

MAINTAINER Jim Clark <jim@atomist.com>

RUN mkdir -p /usr/src/app \
    && mkdir -p /usr/src/app/bin \
    && mkdir -p /usr/src/app/lib

WORKDIR /usr/src/app

COPY target/lib /usr/src/app/lib

COPY target/metajar/incoming-webhooks.jar /usr/src/app/

CMD ["-Djava.net.preferIPv4Stack=true", "-jar", "/usr/src/app/incoming-webhooks.jar", "-Dclojure.core.async.pool-size=20"]

EXPOSE 8080

`;

const updateMeDockerfile = `
FROM sforzando-dockerv2-local.jfrog.io/java-atomist:old-version

MAINTAINER Jim Clark <jim@atomist.com>

RUN mkdir -p /usr/src/app \
    && mkdir -p /usr/src/app/bin \
    && mkdir -p /usr/src/app/lib

WORKDIR /usr/src/app

COPY target/lib /usr/src/app/lib

COPY target/metajar/incoming-webhooks.jar /usr/src/app/

CMD ["-Djava.net.preferIPv4Stack=true", "-jar", "/usr/src/app/incoming-webhooks.jar", "-Dclojure.core.async.pool-size=20"]

EXPOSE 8080

`;

const expectedResult = [{
    type: "docker-base-image",
    name: "sforzando-dockerv2-local.jfrog.io/java-atomist",
    abbreviation: "dbi-sforzando-dockerv2-local.jfrog.io/java-atomist",
    version: "0.0.1",
    data: {
        image: "sforzando-dockerv2-local.jfrog.io/java-atomist",
        version: "0.11.1-20181115141152",
        path: "docker/Dockerfile",
    },
    sha: "95fd745f74af001eda2d76abf5ac1889224dc46bdb5e703d7612a2b67c5c1dc4",
}];

const expectedResultOtherLocation = [{
    type: "docker-base-image",
    name: "sforzando-dockerv2-local.jfrog.io/java-atomist",
    abbreviation: "dbi-sforzando-dockerv2-local.jfrog.io/java-atomist",
    version: "0.0.1",
    data: {
        image: "sforzando-dockerv2-local.jfrog.io/java-atomist",
        version: "0.11.1-20181115141152",
        path: "Dockerfile",
    },
    sha: "127826c5dfbf26f638ab53c8910c6f19ffd60f2adc25d5ec01f34e8688ee1eb6",
}];

describe("docker fingerprints", () => {

    describe("dockerBaseFingerprint", () => {
        describe("extract valid fingerprint", () => {
            it("should extract valid fingerprint", async () => {
                const p = InMemoryProject.from({
                    repo: "foo",
                    sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                    branch: "master",
                    owner: "foo",
                    url: "https://fake.com/foo/foo.git",
                }, ({ path: "docker/Dockerfile", content: dummyDockerFile })) as any;

                const result = await dockerBaseFingerprint(p, undefined);
                assert.deepEqual(result, expectedResult);
            });
        });

        describe("extract valid fingerprint from different location", () => {
            it("should extract valid fingerprint from Dockerfile", async () => {
                const p = InMemoryProject.from({
                    repo: "foo",
                    sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                    branch: "master",
                    owner: "foo",
                    url: "https://fake.com/foo/foo.git",
                }, ({ path: "Dockerfile", content: dummyDockerFile })) as any;

                const result = await dockerBaseFingerprint(p, undefined);
                assert.deepEqual(result, expectedResultOtherLocation);
            });
        });

        describe("empty dockerfile, invalid fingerprint", async () => {
            it("should return undefined", async () => {
                const p = InMemoryProject.from({
                    repo: "foo",
                    sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                    branch: "master",
                    owner: "foo",
                    url: "https://fake.com/foo/foo.git",
                }, ({ path: "docker/Dockerfile", content: "" })) as any;

                const result = await dockerBaseFingerprint(p, undefined);
                assert.deepEqual(result, []);
            });
        });
    });

    describe("applyDockerBaseFingerprint", async () => {
        it("should successfully update the base image", async () => {
            const p = InMemoryProject.from({
                repo: "foo",
                sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                branch: "master",
                owner: "foo",
                url: "https://fake.com/foo/foo.git",
            }, ({ path: "docker/Dockerfile", content: updateMeDockerfile })) as any;

            const result = await applyDockerBaseFingerprint(p, { parameters: { fp: expectedResult[0] } } as any);
            assert.strictEqual(result, true);
        });

        it("should have updated the dockerfile content", async () => {
            const p = InMemoryProject.from({
                repo: "foo",
                sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                branch: "master",
                owner: "foo",
                url: "https://fake.com/foo/foo.git",
            }, ({ path: "docker/Dockerfile", content: updateMeDockerfile })) as any;
            const t = (p as InMemoryProject);

            await applyDockerBaseFingerprint(p, { parameters: { fp: expectedResult[0] } } as any);
            const updatedDockerFileHandle = await t.getFile("docker/Dockerfile");
            const updatedDockerfile = await updatedDockerFileHandle.getContent();

            assert.strictEqual(updatedDockerfile, dummyDockerFile);
        });
    });

    const nginxDockerFile = `
FROM nginx

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY resources/public /usr/share/nginx/html

EXPOSE 8080
`;

    const nginxResult = [{
        type: "docker-base-image",
        name: "nginx",
        abbreviation: "dbi-nginx",
        version: "0.0.1",
        data: { image: "nginx", version: "latest", path: "docker/Dockerfile" },
        sha: "2dc8ec5e6659046426425a2ee77de420b0bd3af693ddbed5ee333844edd9824a",
    }];

    describe("taglessImage", async () => {
        it("should work with a latest image", async () => {
            const p = InMemoryProject.from({
                repo: "foo",
                sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                branch: "master",
                owner: "foo",
                url: "https://fake.com/foo/foo.git",
            }, ({ path: "docker/Dockerfile", content: nginxDockerFile })) as any;

            const result = await dockerBaseFingerprint(p, undefined);
            assert.deepEqual(result, nginxResult);
        });
    });

    describe("dockerPortsFingerprint", () => {

        it("not find fingerprint", async () => {
            const p = InMemoryProject.from({
                repo: "foo",
                sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                branch: "master",
                owner: "foo",
                url: "https://fake.com/foo/foo.git",
            });

            const result = await extractDockerPortsFingerprint(p, undefined) as FP;
            assert.strictEqual(result, undefined);
        });

        it("should extract valid fingerprint", async () => {
            const p = InMemoryProject.from({
                repo: "foo",
                sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                branch: "master",
                owner: "foo",
                url: "https://fake.com/foo/foo.git",
            }, ({ path: "docker/Dockerfile", content: dummyDockerFile })) as any;

            const result = await extractDockerPortsFingerprint(p, undefined) as FP;
            assert.strictEqual(result.type, DockerPortsType);
            assert.deepStrictEqual(result.data, ["8080"]);
        });

        it("should extract complex fingerprint", async () => {
            const p = InMemoryProject.from({
                repo: "foo",
                sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                branch: "master",
                owner: "foo",
                url: "https://fake.com/foo/foo.git",
            }, ({
                path: "docker/Dockerfile",
                content: "EXPOSE 80/tcp\nEXPOSE 80/udp\n",
            }));

            const result = await extractDockerPortsFingerprint(p, undefined) as FP;
            assert.strictEqual(result.type, DockerPortsType);
            assert.deepStrictEqual(result.data, ["80/tcp", "80/udp"]);
        });
    });

    describe("dockerPathFingerprint", () => {

        it("not find fingerprint", async () => {
            const p = InMemoryProject.from({
                repo: "foo",
                sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                branch: "master",
                owner: "foo",
                url: "https://fake.com/foo/foo.git",
            });

            const result = await extractDockerPathFingerprint(p, undefined) as FP;
            assert.strictEqual(result, undefined);
        });

        it("should extract valid fingerprint", async () => {
            const p = InMemoryProject.from({
                repo: "foo",
                sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                branch: "master",
                owner: "foo",
                url: "https://fake.com/foo/foo.git",
            }, ({ path: "Dockerfile", content: dummyDockerFile })) as any;

            const result = await extractDockerPathFingerprint(p, undefined) as FP;
            assert.strictEqual(result.type, DockerPathType);
            assert.deepStrictEqual(result.data, "Dockerfile");
        });

        it("should extract nested fingerprint", async () => {
            const p = InMemoryProject.from({
                repo: "foo",
                sha: "26e18ee3e30c0df0f0f2ff0bc42a4bd08a7024b9",
                branch: "master",
                owner: "foo",
                url: "https://fake.com/foo/foo.git",
            }, ({ path: "docker/Dockerfile", content: dummyDockerFile })) as any;

            const result = await extractDockerPathFingerprint(p, undefined) as FP;
            assert.strictEqual(result.type, DockerPathType);
            assert.deepStrictEqual(result.data, "docker/Dockerfile");
        });
    });

});
