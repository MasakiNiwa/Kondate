/**
 * CPLEX LP 形式のモデルを組み立てる小さなヘルパー（HiGHS に文字列で渡す）。
 * 1 行が長くなりすぎないよう、項は数個ごとに改行する。
 */
export type Term = [coef: number, name: string];

function num(v: number): string {
  // 指数表記を避け、細かすぎる桁は丸める
  const r = Math.round(v * 1e6) / 1e6;
  return String(Math.abs(r) < 1e-9 ? 0 : r);
}

export function expr(terms: Term[]): string {
  const merged = new Map<string, number>();
  for (const [c, n] of terms) merged.set(n, (merged.get(n) ?? 0) + c);
  const parts: string[] = [];
  for (const [n, c] of merged) {
    if (Math.abs(c) < 1e-9) continue;
    const sign = c < 0 ? '-' : '+';
    parts.push(`${sign} ${num(Math.abs(c))} ${n}`);
  }
  if (parts.length === 0) return '0 dummy';
  const lines: string[] = [];
  for (let i = 0; i < parts.length; i += 6) lines.push(parts.slice(i, i + 6).join(' '));
  return lines.join('\n   ');
}

function chunk(names: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < names.length; i += 12) out.push(` ${names.slice(i, i + 12).join(' ')}`);
  return out;
}

export class LpModel {
  private objective: Term[] = [];
  private rows: string[] = [];
  private bounds: string[] = [];
  private binaries = new Set<string>();
  private generals = new Set<string>();
  private continuous = new Set<string>();
  private rowCount = 0;

  addObjective(coef: number, name: string) {
    if (coef !== 0) this.objective.push([coef, name]);
  }

  binary(name: string) {
    this.binaries.add(name);
    return name;
  }

  integer(name: string, upper?: number) {
    this.generals.add(name);
    if (upper !== undefined) this.bounds.push(` 0 <= ${name} <= ${num(upper)}`);
    return name;
  }

  /** 0 以上の連続変数 */
  real(name: string, upper?: number) {
    this.continuous.add(name);
    if (upper !== undefined) this.bounds.push(` 0 <= ${name} <= ${num(upper)}`);
    return name;
  }

  fix(name: string, value: number) {
    this.bounds.push(` ${name} = ${num(value)}`);
  }

  constraint(terms: Term[], op: '<=' | '>=' | '=', rhs: number) {
    if (terms.length === 0) return;
    this.rowCount++;
    this.rows.push(` r${this.rowCount}: ${expr(terms)} ${op} ${num(rhs)}`);
  }

  get variableCount() {
    return this.binaries.size + this.generals.size + this.continuous.size;
  }

  get constraintCount() {
    return this.rowCount;
  }

  toString(): string {
    // 目的関数に出てこない変数も宣言されるよう、係数 0 の項は expr が落とすので、ダミーで 1 つ必ず置く
    const all = [...this.binaries, ...this.generals, ...this.continuous];
    const obj = this.objective.length > 0 ? expr(this.objective) : `0 ${all[0] ?? 'dummy'}`;
    return [
      'Minimize',
      ` obj: ${obj}`,
      'Subject To',
      ...this.rows,
      'Bounds',
      ...this.bounds,
      ...[...this.binaries].map((b) => ` 0 <= ${b} <= 1`),
      this.generals.size > 0 ? 'General' : '',
      ...chunk([...this.generals]),
      this.binaries.size > 0 ? 'Binary' : '',
      ...chunk([...this.binaries]),
      'End',
    ]
      .filter((l) => l !== '')
      .join('\n');
  }
}
