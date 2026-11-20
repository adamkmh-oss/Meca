import { describe, expect, it } from "vitest";
import { Ex, parseExpr, plain, tex, texInX } from "../symbolic";

const P = parseExpr;

describe("calcul littéral", () => {
  it("lit les expressions usuelles", () => {
    expect(tex(P("L/2"))).toBe("\\dfrac{L}{2}");
    expect(tex(P("2a"))).toBe("2 a");
    expect(tex(P("qL"))).toBe("q L");
    expect(tex(P("L - a"))).toBe("L - a");
    expect(tex(P("F_1"))).toBe("F_{1}");
    expect(tex(P("q1*L^2/8"))).toBe("\\dfrac{q_{1} L^{2}}{8}");
    expect(tex(P("0,5 F"))).toBe("\\dfrac{F}{2}");
    expect(() => P("2*")).toThrow();
    expect(() => P("a + $")).toThrow();
  });

  it("simplifie les fractions rationnelles", () => {
    // V_B = (F a + qL·L/2) / L
    const vb = P("F*a").add(P("q*L").mul(P("L/2"))).div(P("L"));
    expect(tex(vb)).toBe("\\dfrac{q L}{2} + \\dfrac{F a}{L}");
    expect(tex(P("q*(a+b)^2/2").div(P("a+b")))).toBe("\\dfrac{q a}{2} + \\dfrac{q b}{2}");
    expect(tex(P("F*a").div(P("a+b")))).toBe("\\dfrac{F a}{a + b}");
    expect(P("(x+1)^2 - x^2 - 2x").equals(Ex.n(1))).toBe(true);
  });

  it("polynômes en x et substitution", () => {
    const M = P("q*L/2*x - q*x^2/2");
    expect(texInX(M)).toBe("\\dfrac{q L x}{2} - \\dfrac{q x^{2}}{2}");
    expect(tex(M.subst("x", P("L/2")))).toBe("\\dfrac{q L^{2}}{8}");
    expect(M.eval({ q: 10, L: 6, x: 3 })).toBeCloseTo(45, 12);
    expect(plain(P("q*L^2/8"))).toBe("qL^2/8");
  });

  it("trigonométrie : cos / sin → tan", () => {
    const e = P("3P").mul(Ex.s("cos(α)")).div(P("2").mul(Ex.s("sin(α)")));
    expect(tex(e)).toBe("\\dfrac{3 P}{2 \\tan \\alpha}");
    expect(e.eval({ P: 1, "angle:α": Math.PI / 4 })).toBeCloseTo(1.5, 12);
  });
});
