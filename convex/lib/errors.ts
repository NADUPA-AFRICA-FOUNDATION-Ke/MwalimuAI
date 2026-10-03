import { ConvexError } from "convex/values";

/** Every expected failure carries a stable `code` (for tests and UI) and a human `message`. */
export const fail = (code: string, message: string) => new ConvexError({ code, message });
export const notFound = (what: string) => fail("NOT_FOUND", `${what} not found`);
export const forbidden = () => fail("FORBIDDEN", "Not authorised");
