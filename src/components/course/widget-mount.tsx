"use client";
import type { WidgetId } from "@/content/types";
import { Widget } from "./widgets";

export function WidgetMount({ id }: { id: WidgetId }) {
  return <Widget id={id} />;
}
