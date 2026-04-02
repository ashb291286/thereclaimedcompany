import { auth } from "@/auth";
import { createUploadthing, type FileRouter } from "uploadthing/server";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const drivenUploadRouter = {
  drivenLineageDocument: f({
    pdf: { maxFileSize: "32MB", maxFileCount: 12 },
    image: { maxFileSize: "32MB", maxFileCount: 12 },
    blob: { maxFileSize: "32MB", maxFileCount: 12 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) {
        throw new UploadThingError("You must be signed in to upload.");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type DrivenUploadRouter = typeof drivenUploadRouter;
