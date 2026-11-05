// 한국어 과제 세트를 만든다: 정답 트레이스(scripts/tasks-ko.mjs)의 각 단계를 실제 도구로 한 번 실행해
// observation/answer/source를 녹음하고, 인자가 후보 선택지에 실제로 나오는지(추출기 재현율)를 검사한다.
//   node scripts/build_tasks_ko.mjs
// 결과: web/tasks.json (평가 페이지가 읽는다). 네트워크가 필요하다 (위키백과·Wikidata·Open-Meteo).
import fs from "node:fs";
import { TASKS, SEED_NOTES, NOW, AMBIGUOUS_ANSWERS } from "./tasks-ko.mjs";
import { TOOL, TOOLS } from "../web/tools/index.js";
import { memoryNotes } from "../web/tools/notes.js";
import { extractCandidates, slotOptions, NONE } from "../web/candidates.js";
import { goldChoices } from "../web/gold.js";
import { stepLine } from "../web/tools/index.js";

const first = (v) => (Array.isArray(v) ? v[0] : v);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runStep(task, step, obsSoFar) {
  const tool = TOOL[step.action];
  if (!tool) throw new Error(`${task.id}: unknown tool ${step.action}`);
  let chosen = step;
  let r = null;
  // 정답이 대안 호출이면 그쪽을 실행한다 (기본 호출이 실패했을 때만)
  try {
    r = await tool.run(firstArgs(step.args), ctxFor(task, obsSoFar));
  } catch (e) {
    for (const alt of step.alt || []) {
      const t2 = TOOL[alt.action];
      try { r = await t2.run(firstArgs(alt.args), ctxFor(task, obsSoFar)); chosen = alt; break; } catch { /* 다음 대안 */ }
    }
    if (!r) throw new Error(`${task.id}/${step.action}: ${e.message}`);
  }
  if (r.ok === false) {
    for (const alt of step.alt || []) {
      const t2 = TOOL[alt.action];
      try { const r2 = await t2.run(firstArgs(alt.args), ctxFor(task, obsSoFar)); if (r2.ok !== false) { r = r2; chosen = alt; break; } } catch { /* 다음 대안 */ }
    }
  }
  if (r.ok === false) throw new Error(`${task.id}/${chosen.action}: 도구가 실패했습니다 — ${r.observation}`);
  return { chosen, r };
}
const firstArgs = (a = {}) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, first(v)]));
const ctxFor = (task, obsSoFar) => ({
  now: NOW,
  notes: memoryNotes(SEED_NOTES),
  askUser: async () => AMBIGUOUS_ANSWERS[task.id] || "잘 모르겠어요",
  fetch: globalThis.fetch,
});

// ---- 1) 실행 & 녹음 ------------------------------------------------------------------------------------------------
const out = [];
const problems = [];
for (const task of TASKS) {
  const notes = memoryNotes(SEED_NOTES);
  const steps = [];
  let prevObs = "";
  for (const step of task.steps) {
    if (step.action === "FINISH") continue;
    const ctx = { now: NOW, notes, askUser: async () => AMBIGUOUS_ANSWERS[task.id] || "잘 모르겠어요", fetch: globalThis.fetch };
    const tool = TOOL[step.action];
    let chosen = step, r = null, lastErr = null;
    for (const cand of goldChoices(step)) {
      try {
        const rr = await TOOL[cand.action].run(firstArgs(cand.args), ctx);
        if (rr.ok === false) { lastErr = new Error(rr.observation); continue; }
        r = rr; chosen = cand; break;
      } catch (e) { lastErr = e; }
    }
    if (!r) { problems.push(`${task.id} ${step.action}: ${lastErr?.message}`); break; }
    const rec = { action: chosen.action, args: chosen.args };
    if (chosen !== step) rec.alt = [step];
    rec.observation = r.observation || "";
    rec.answer = r.answer || r.observation || "";
    if (r.source) rec.source = r.source;
    steps.push(rec);
    prevObs = r.observation || "";
    await sleep(700); // Wikidata·Open-Meteo 예절 (429를 피한다)
  }
  if (!steps.length || steps.at(-1).action === "FINISH") { out.push({ ...task, steps, answer: steps.at(-1)?.answer || "" }); continue; }
  steps.push({ action: "FINISH", args: {}, observation: "" });
  out.push({ id: task.id, split: task.split, category: task.category, goal: task.goal, steps, answer: steps.at(-2).answer });
}

// ---- 2) 추출기 검사: 정답 인자가 실제 선택지에 나오는가 -----------------------------------------------------------
for (const task of out) {
  if (task.category === "rewrite") continue; // 정답 인자가 일부러 본문에 없다 (그게 이 분류의 요점)
  for (let i = 0; i < task.steps.length; i++) {
    const s = task.steps[i];
    if (s.action === "FINISH") continue;
    const prevObs = i ? task.steps[i - 1].observation || "" : "";
    const cands = extractCandidates(null, task.goal, prevObs);
    for (const slot of TOOL[s.action].slots || []) {
      if (slot.fixed) {
        const ok = Object.keys(slot.fixed).includes(first(s.args[slot.name]));
        if (!ok) problems.push(`${task.id}/${s.action}.${slot.name}: "${first(s.args[slot.name])}"가 고정 목록에 없음`);
      } else {
        const opts = Object.keys(slotOptions(slot, cands)).filter((k) => k !== NONE);
        const alts = Array.isArray(s.args[slot.name]) ? s.args[slot.name] : [s.args[slot.name]];
        if (!alts.some((v) => opts.some((o) => o.toLowerCase() === String(v).toLowerCase()))) {
          problems.push(`${task.id}/${s.action}.${slot.name}: "${alts[0]}"가 후보에 없음 (후보: ${opts.slice(0, 8).join(" | ") || "없음"})`);
        }
      }
    }
  }
}

// ---- 3) 저장 --------------------------------------------------------------------------------------------------------
const json = {
  version: 1,
  recordedAt: new Date().toISOString(),
  seedNotes: SEED_NOTES,
  note: "한국어 합성 과제. 도구 출력은 scripts/build_tasks_ko.mjs가 실제 도구로 녹음했다. 정답 인자가 배열이면 그중 하나면 맞는다.",
  tasks: out,
};
fs.writeFileSync(new URL("../web/tasks.json", import.meta.url), JSON.stringify(json, null, 1) + "\n");
const dev = out.filter((t) => t.split === "dev").length;
console.log(`tasks ${out.length} (dev ${dev} / test ${out.length - dev}), steps ${out.reduce((a, t) => a + t.steps.length, 0)}`);
console.log(`problems ${problems.length}`);
for (const p of problems) console.log("  - " + p);
