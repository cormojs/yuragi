import { hc } from "hono/client";
import type { AppType } from "../../server/controller/ApiController";

export const apiClient = hc<AppType>(window.location.origin);
