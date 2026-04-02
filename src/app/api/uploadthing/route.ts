import { createRouteHandler } from "uploadthing/next";
import { drivenUploadRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: drivenUploadRouter,
});
