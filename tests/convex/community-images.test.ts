import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { stripMetadata } from "../../convex/lib/imageSafety";
import { makeLearner, newTest, type T } from "./helpers";

afterEach(() => vi.useRealTimers());

const seg = (marker: number, body: number[]) => [0xff, marker, ((body.length + 2) >> 8) & 0xff, (body.length + 2) & 0xff, ...body];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
/** A tiny JPEG-shaped file: JFIF header, an EXIF block with a fake GPS string, a comment, then picture data. */
const jpeg = new Uint8Array([0xff, 0xd8, ...seg(0xe0, ascii("JFIF\0")), ...seg(0xe1, ascii("Exif\0\0GPS-1.2921,36.8219")), ...seg(0xfe, ascii("secret comment")), ...seg(0xdb, [0, 1, 2]), 0xff, 0xda, 0, 2, 9, 9, 9, 0xff, 0xd9]);

describe("image metadata stripping", () => {
  it("removes EXIF and comments from a JPEG but keeps the picture", () => {
    const out = stripMetadata(jpeg, "image/jpeg")!;
    const text = String.fromCharCode(...out);
    expect(text).not.toContain("GPS");
    expect(text).not.toContain("secret");
    expect(text).toContain("JFIF");
    expect(out[out.length - 1]).toBe(0xd9);
  });

  it("removes text chunks from a PNG", () => {
    const chunk = (type: string, data: number[]) => [0, 0, 0, data.length, ...ascii(type), ...data, 0, 0, 0, 0];
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunk("IHDR", Array(13).fill(1)), ...chunk("tEXt", ascii("Author\0Jane")), ...chunk("IDAT", [5, 5]), ...chunk("IEND", [])]);
    const out = String.fromCharCode(...stripMetadata(png, "image/png")!);
    expect(out).not.toContain("Jane");
    expect(out).toContain("IDAT");
  });

  it("rejects bytes that are not the declared type", () => {
    expect(stripMetadata(new Uint8Array([1, 2, 3, 4]), "image/jpeg")).toBeNull();
  });
});

async function upload(t: T, bytes: Uint8Array, type: string) {
  return await t.run(async (ctx) => {
    const id = await ctx.storage.store(new Blob([bytes as BlobPart], { type }));
    // convex-test does not record the content type; set it as the real backend would.
    await (ctx.db as any).patch(id, { contentType: type }); // eslint-disable-line @typescript-eslint/no-explicit-any
    return id;
  });
}

describe("photos in community posts", () => {
  it("validates, hides pending photos from others, strips metadata, then publishes", async () => {
    vi.useFakeTimers();
    const t = newTest();
    const author = await makeLearner(t, { name: "Author" });
    const reader = await makeLearner(t, { name: "Reader" });
    const img = await upload(t, jpeg, "image/jpeg");
    const pdf = await upload(t, new Uint8Array([1]), "application/pdf");

    await expect(author.as.mutation(api.community.createPost, { title: "Our chart", content: "Look", category: "Resources", images: [{ storageId: pdf, alt: "A file" }] })).rejects.toThrow(/JPG, PNG or WebP/);
    await expect(author.as.mutation(api.community.createPost, { title: "Our chart", content: "Look", category: "Resources", images: [{ storageId: img, alt: "" }] })).rejects.toThrow(/Describe/);

    await author.as.mutation(api.community.createPost, { title: "Our chart", content: "Look", category: "Resources", images: [{ storageId: img, alt: "Bean growth chart" }] });
    expect((await reader.as.query(api.community.listPosts, {}))[0].images).toEqual([]);
    expect((await author.as.query(api.community.listPosts, {}))[0].images[0]).toMatchObject({ pending: true, alt: "Bean growth chart" });

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const shown = (await reader.as.query(api.community.listPosts, {}))[0].images;
    expect(shown).toHaveLength(1);
    expect(shown[0].pending).toBe(false);
    const stored = await t.run(async (ctx) => {
      const post = (await ctx.db.query("communityPosts").first())!;
      return String.fromCharCode(...new Uint8Array(await (await ctx.storage.get(post.images![0].storageId))!.arrayBuffer()));
    });
    expect(stored).toContain("JFIF");
    expect(stored).not.toContain("GPS");
    // The original upload (with metadata) is deleted.
    expect(await t.run((ctx) => ctx.storage.get(img))).toBeNull();
  });

  it("does not publish a file that is not really a photo", async () => {
    vi.useFakeTimers();
    const t = newTest();
    const author = await makeLearner(t, { name: "Author" });
    const fake = await upload(t, new Uint8Array([60, 115, 99, 114, 105, 112, 116, 62]), "image/jpeg"); // "<script>"
    await author.as.mutation(api.community.createPost, { title: "x", content: "y", category: "Resources", images: [{ storageId: fake, alt: "Not a photo" }] });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await author.as.query(api.community.listPosts, {}))[0].images).toEqual([]);
    const notes = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notes.some((n) => n.title === "A photo was not published")).toBe(true);
    const staff = await t.run((ctx) => ctx.db.query("staffNotices").collect());
    expect(staff[0].kind).toBe("image_flagged");
  });
});
