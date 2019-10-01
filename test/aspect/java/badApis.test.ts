import { InMemoryProject } from "@atomist/automation-client";
import { Immaterial } from "@atomist/sdm";
import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import * as assert from "assert";
import {
    CatchesThrowable,
    CreatesNewThread,
    ThrowsRuntimeException,
    UsesDirectJdbcApis,
    UsesJavaUtilDateOrCalendar,
} from "../../../lib/aspect/java/badApis";

describe("Bad Java APIs", () => {
    describe("java.util.Date and java.util.Calendar", () => {
        it("should not match on no usage", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
public class Test {
    public static void main(String[] args) {
    }
}
                `,
            });
            const fp = toArray(await UsesJavaUtilDateOrCalendar.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 0);
        });

        it("should match on java.util.Date usage", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
import java.util.Date;

public class Test {
    public static void main(String[] args) {
        Date date = new Date();
    }
}
                `,
            });
            const fp = toArray(await UsesJavaUtilDateOrCalendar.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.java");
        });

        it("should match on java.util.Calendar usage", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
import java.util.Calendar;

public class App {
    public static void main(String[] args) {
        Calendar.getInstance().getTime();
    }
}
                `,
            });
            const fp = toArray(await UsesJavaUtilDateOrCalendar.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.java");
        });
    });

    describe("new Thread", () => {
        it("should not match on no usage", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
public class App {
    public static void main(String[] args) {
        Runnable r = () -> {};
    }
}
                `,
            });
            const fp = toArray(await CreatesNewThread.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 0);
        });

        it("should match on new Thread(...)", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
public class App {
    public static void main(String[] args) {
        Runnable r = () -> {};
        new Thread(r);
    }
}
                `,
            });
            const fp = toArray(await CreatesNewThread.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.java");
        });
    });

    describe("Uses direct JDBC APIs", () => {
        it("should not match on no usage", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
public class App {
    public static void main(String[] args) {
    }
}
                `,
            });
            const fp = toArray(await UsesDirectJdbcApis.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 0);
        });

        it("should match on Connection import", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
import java.sql.Connection;

public class App {
    public static void main(String[] args) {
    }
}
                `,
            });
            const fp = toArray(await UsesDirectJdbcApis.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.java");
        });

        it("should match on Statement import", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
import java.sql.Statement;

public class App {
    public static void main(String[] args) {
    }
}
                `,
            });
            const fp = toArray(await UsesDirectJdbcApis.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.java");
        });

        it("should match on PreparedStatement import", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
import java.sql.PreparedStatement;

public class App {
    public static void main(String[] args) {
    }
}
                `,
            });
            const fp = toArray(await UsesDirectJdbcApis.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.java");
        });

        it("should match on CallableStatement import", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
import java.sql.CallableStatement;

public class App {
    public static void main(String[] args) {
    }
}
                `,
            });
            const fp = toArray(await UsesDirectJdbcApis.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.java");
        });

        it("should match on ResultSet import", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
import java.sql.ResultSet;

public class App {
    public static void main(String[] args) {
    }
}
                `,
            });
            const fp = toArray(await UsesDirectJdbcApis.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.java");
        });
    });

    describe("throws RuntimeException", () => {
        it("should not match on no usage", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
public class App {
    public static void main(String[] args) {
    }
}
                `,
            });
            const fp = toArray(await ThrowsRuntimeException.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 0);
        });

        it("should match on throwing RuntimeException", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
public class App {
    public static void main(String[] args) {
        try {
            System.out.println("Hello");
        catch(Exception e) {
            throw new RuntimeException("Blah", e);
        }
    }
}
                `,
            });
            const fp = toArray(await ThrowsRuntimeException.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.java");
        });

        it("should match on throwing RuntimeException in Kotlin", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.kt", content: `
class App {
    fun main(args: String[]) {
        try {
            println("Hello");
        catch(e: Exception) {
            throw RuntimeException("Blah", e);
        }
    }
}
                `,
            });
            const fp = toArray(await ThrowsRuntimeException.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.kt");
        });
    });

    describe("catches Throwable", () => {
        it("should not match on no usage", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
public class App {
    public static void main(String[] args) {
    }
}
                `,
            });
            const fp = toArray(await CatchesThrowable.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 0);
        });

        it("should match on catching Throwable", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.java", content: `
public class App {
    public static void main(String[] args) {
        try {
            System.out.println("Hello");
        catch(Throwable e) {
            throw new RuntimeException("Blah", e);
        }
    }
}
                `,
            });
            const fp = toArray(await CatchesThrowable.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.java");
        });

        it("should match on catching Throwable in Kotlin", async () => {
            const p = InMemoryProject.of({
                path: "src/main/java/test/Test.kt", content: `
class App {
    fun main(args: String[]) {
        try {
            println("Hello");
        catch(t: Throwable) {
            throw RuntimeException("Blah", e);
        }
    }
}
                `,
            });
            const fp = toArray(await CatchesThrowable.extract(p, undefined));
            assert.strictEqual(fp.length, 1);
            assert.strictEqual(fp[0].data.matches.length, 1);
            assert.strictEqual(fp[0].data.matches[0].path, "src/main/java/test/Test.kt");
        });
    });
});
