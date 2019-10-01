import {
    globAspect,
    GlobAspectData,
} from "@atomist/sdm-pack-aspect";
import {
    Aspect,
    FP,
} from "@atomist/sdm-pack-fingerprint";
import { Plugin } from "@atomist/sdm-pack-spring";
import {
    AllJavaAndKotlinFiles,
    JavaAndKotlinSource,
} from "@atomist/sdm-pack-spring/lib/java/javaProjectUtils";

export function isUsesJavaUtilDateOrCalendarFingerprint(fp: FP): fp is FP<GlobAspectData> {
    return fp.type === UsesJavaUtilDateOrCalendarType;
}

export const UsesJavaUtilDateOrCalendarType = "UsesJavaUtilDateOrCalendar";
export const UsesJavaUtilDateOrCalendar: Aspect<GlobAspectData> = globAspect({
    name: UsesJavaUtilDateOrCalendarType,
    displayName: "Uses java.util.Date or java.util.Calendar",
    glob: AllJavaAndKotlinFiles,
    contentTest: content => content.includes("java.util.Date") || content.includes("java.util.Calendar"),
});

export function isCreatesNewThreadFingerprint(fp: FP): fp is FP<GlobAspectData> {
    return fp.type === CreatesNewThreadType;
}

export const CreatesNewThreadType = "CreatesNewThread";
export const CreatesNewThread: Aspect<GlobAspectData> = globAspect({
    name: CreatesNewThreadType,
    displayName: "Uses new Thread()",
    glob: AllJavaAndKotlinFiles,
    contentTest: content => {
        return content.includes("new Thread(") ||
            content.includes("new java.lang.Thread(");
    },
});

export function isUsesDirectJdbcApisFingerprint(fp: FP): fp is FP<GlobAspectData> {
    return fp.type === UsesDirectJdbcApisType;
}

export const UsesDirectJdbcApisType = "UsesDirectJdbcApis";
export const UsesDirectJdbcApis: Aspect<GlobAspectData> = globAspect({
    name: UsesDirectJdbcApisType,
    displayName: "Uses direct JDBC APIs",
    glob: AllJavaAndKotlinFiles,
    contentTest: content => {
        return content.includes("import java.sql.Connection") ||
            content.includes("import java.sql.PreparedStatement") ||
            content.includes("import java.sql.CallableStatement") ||
            content.includes("import java.sql.Statement") ||
            content.includes("import java.sql.ResultSet");
    },
});

export function isThrowsRuntimeExceptionFingerprint(fp: FP): fp is FP<GlobAspectData> {
    return fp.type === ThrowsRuntimeExceptionType;
}

export const ThrowsRuntimeExceptionType = "ThrowsRuntimeException";
export const ThrowsRuntimeException: Aspect<GlobAspectData> = globAspect({
    name: ThrowsRuntimeExceptionType,
    displayName: "Throws RuntimeException directly",
    glob: AllJavaAndKotlinFiles,
    contentTest: content => {
        return content.includes("throw RuntimeException(") ||
            content.includes("throw new RuntimeException(");
    },
});

export function isCatchesThrowableFingerprint(fp: FP): fp is FP<GlobAspectData> {
    return fp.type === CatchesThrowableType;
}

export const CatchesThrowableType = "CatchesThrowable";
export const CatchesThrowable: Aspect<GlobAspectData> = globAspect({
    name: CatchesThrowableType,
    displayName: "Catches Throwable in production code",
    glob: JavaAndKotlinSource,
    contentTest: content => {
        const javaRegex = /catch\s*\(\s*Throwable/g;
        const kotlinRegex = /catch\s*\(.*:\s*Throwable/g;
        return javaRegex.test(content) ||
            kotlinRegex.test(content);
    },
});

export const BadJavaApis = [
    UsesDirectJdbcApis,
    UsesJavaUtilDateOrCalendar,
    CreatesNewThread,
    ThrowsRuntimeException,
    CatchesThrowable,
];
