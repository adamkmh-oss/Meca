import type { BeamHinge, BeamLoad, BeamSupport } from "@/lib/mechanics/beam";

export interface BeamDraft {
  length: number;
  supports: BeamSupport[];
  hinges: BeamHinge[];
  loads: BeamLoad[];
}

export const BEAM_PRESETS: { id: string; label: string; draft: BeamDraft }[] = [
  {
    id: "ss-udl",
    label: "Poutre sur deux appuis — charge répartie",
    draft: {
      length: 6,
      supports: [
        { id: "A", x: 0, type: "pin" },
        { id: "B", x: 6, type: "roller" },
      ],
      hinges: [],
      loads: [{ id: "q1", kind: "dist", x1: 0, x2: 6, q1: 10, q2: 10 }],
    },
  },
  {
    id: "ss-point",
    label: "Poutre sur deux appuis — charge ponctuelle",
    draft: {
      length: 6,
      supports: [
        { id: "A", x: 0, type: "pin" },
        { id: "B", x: 6, type: "roller" },
      ],
      hinges: [],
      loads: [{ id: "F1", kind: "point", x: 2, F: 20, angle: -90 }],
    },
  },
  {
    id: "multi",
    label: "Poutre avec plusieurs charges",
    draft: {
      length: 8,
      supports: [
        { id: "A", x: 0, type: "pin" },
        { id: "B", x: 8, type: "roller" },
      ],
      hinges: [],
      loads: [
        { id: "F1", kind: "point", x: 2, F: 15, angle: -90 },
        { id: "F2", kind: "point", x: 5.5, F: 10, angle: -90 },
        { id: "q1", kind: "dist", x1: 3, x2: 8, q1: 6, q2: 6 },
      ],
    },
  },
  {
    id: "cantilever",
    label: "Console (encastrement) — charge en bout",
    draft: {
      length: 3,
      supports: [{ id: "A", x: 0, type: "fixed" }],
      hinges: [],
      loads: [{ id: "F1", kind: "point", x: 3, F: 12, angle: -90 }],
    },
  },
  {
    id: "cantilever-udl",
    label: "Console — charge répartie",
    draft: {
      length: 2.5,
      supports: [{ id: "A", x: 0, type: "fixed" }],
      hinges: [],
      loads: [{ id: "q1", kind: "dist", x1: 0, x2: 2.5, q1: 8, q2: 8 }],
    },
  },
  {
    id: "overhang",
    label: "Poutre à porte-à-faux",
    draft: {
      length: 8,
      supports: [
        { id: "A", x: 0, type: "pin" },
        { id: "B", x: 6, type: "roller" },
      ],
      hinges: [],
      loads: [
        { id: "q1", kind: "dist", x1: 0, x2: 8, q1: 8, q2: 8 },
        { id: "F1", kind: "point", x: 8, F: 10, angle: -90 },
      ],
    },
  },
  {
    id: "triangle",
    label: "Charge triangulaire",
    draft: {
      length: 6,
      supports: [
        { id: "A", x: 0, type: "pin" },
        { id: "B", x: 6, type: "roller" },
      ],
      hinges: [],
      loads: [{ id: "q1", kind: "dist", x1: 0, x2: 6, q1: 0, q2: 15 }],
    },
  },
  {
    id: "inclined",
    label: "Force inclinée (effort normal)",
    draft: {
      length: 5,
      supports: [
        { id: "A", x: 0, type: "pin" },
        { id: "B", x: 5, type: "roller" },
      ],
      hinges: [],
      loads: [{ id: "F1", kind: "point", x: 2, F: 20, angle: -60 }],
    },
  },
  {
    id: "propped",
    label: "Encastrée – appuyée (hyperstatique)",
    draft: {
      length: 6,
      supports: [
        { id: "A", x: 0, type: "fixed" },
        { id: "B", x: 6, type: "roller" },
      ],
      hinges: [],
      loads: [{ id: "q1", kind: "dist", x1: 0, x2: 6, q1: 10, q2: 10 }],
    },
  },
  {
    id: "continuous",
    label: "Poutre continue à deux travées",
    draft: {
      length: 10,
      supports: [
        { id: "A", x: 0, type: "pin" },
        { id: "B", x: 5, type: "roller" },
        { id: "C", x: 10, type: "roller" },
      ],
      hinges: [],
      loads: [{ id: "q1", kind: "dist", x1: 0, x2: 10, q1: 10, q2: 10 }],
    },
  },
  {
    id: "gerber",
    label: "Poutre Gerber (rotule interne)",
    draft: {
      length: 10,
      supports: [
        { id: "A", x: 0, type: "pin" },
        { id: "B", x: 6, type: "roller" },
        { id: "C", x: 10, type: "roller" },
      ],
      hinges: [{ id: "R1", x: 7.5 }],
      loads: [{ id: "q1", kind: "dist", x1: 0, x2: 10, q1: 10, q2: 10 }],
    },
  },
];
