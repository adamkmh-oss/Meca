"use client";
import { useState } from "react";
import { Segmented } from "@/components/ui";
import { BeamSimulator } from "./beam-simulator";
import { FrameSimulator, TrussSimulator } from "./frame-truss-simulators";

export function SimulatorTabs() {
  const [mode, setMode] = useState<"poutre" | "portique" | "treillis">("poutre");
  return (
    <div className="space-y-5">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "poutre", label: "Poutre" },
          { value: "portique", label: "Portique" },
          { value: "treillis", label: "Treillis" },
        ]}
      />
      {mode === "poutre" && <BeamSimulator />}
      {mode === "portique" && <FrameSimulator />}
      {mode === "treillis" && <TrussSimulator />}
    </div>
  );
}
