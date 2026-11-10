import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportServerError } = await import("@/lib/monitoring");
  await reportServerError(err, { path: request.path, method: request.method, routeType: context.routeType, routePath: context.routePath });
};
