// Node 단위 테스트 (한국어판): 도구(네트워크 없음), 한국어 후보 추출, 상태 예산, 게이트, 모의 Laya로 돌린
// 에이전트 루프, 지표, 과제 세트, recorded.json. 실행: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import nlp from "compromise";
import dates from "compromise-dates";
import { evaluateExpression } from "../web/tools/calculator.js";
import { parseQuantity, convert } from "../web/tools/units.js";
import { parseDate, parseOffset } from "../web/tools/datemath.js";
import { dayIndices as weatherDays } from "../web/tools/weather.js";
import { memoryNotes, searchNotes } from "../web/tools/notes.js";
import { currentStatements } from "../web/tools/wikidata.js";
import { firstSentences } from "../web/tools/wiki.js";
import { TOOL, TOOLS, isSideEffect } from "../web/tools/index.js";
import { extractCandidates, slotOptions, NONE } from "../web/candidates.js";
import { buildState, truncateTokens } from "../web/state.js";
import { route, guard, score, DEFAULTS } from "../web/gate.js";
import { actionQuestions, argQuestions } from "../web/questions.js";
import { runAgent } from "../web/agent.js";
import { argMatch, goldOption, matchStep } from "../web/gold.js";
import { evaluate, taskResults, tuneOnDev } from "../web/metrics.js";
import { parseReply, STEP_SCHEMA } from "../web/system2.js";
import { questionsKey } from "../web/evalrun.js";
import { toTurtle, compactRun, reroute } from "../web/trace.js";
import { splitParticle, nounSpans, clauses, arithmetic } from "../web/ko.js";

nlp.plugin(dates);
const tasks = JSON.parse(fs.readFileSync(new URL("../web/tasks.json", import.meta.url), "utf8"));

// ---- 도구 -----------------------------------------------------------------------------------------------------------
test("calculator: 한국어 산술과 퍼센트, eval 없음", () => {
  assert.equal(evaluateExpression("2,450의 18%"), 441);
  assert.equal(evaluateExpression("(45 + 55) * 3"), 300);
  assert.equal(evaluateExpression("7,200 나누기 16"), 450);
  assert.equal(evaluateExpression("1,250 곱하기 12"), 15000);
  assert.equal(evaluateExpression("2의 10제곱"), 1024);
  assert.equal(evaluateExpression("3 + 4 곱하기 2"), 11);
  assert.throws(() => evaluateExpression("alert(1)"));
});

test("units: 한국어 단위 파싱과 환산", () => {
  assert.deepEqual(parseQuantity("20도"), { value: 20, unit: "C" });
  assert.deepEqual(parseQuantity("1,000미터"), { value: 1000, unit: "m" });
  assert.deepEqual(parseQuantity("70킬로그램"), { value: 70, unit: "kg" });
  assert.ok(Math.abs(convert(5, "mi", "km") - 8.04672) < 1e-9);
  assert.ok(Math.abs(convert(100, "F", "C") - 37.7778) < 1e-3);
  assert.throws(() => convert(1, "kg", "km"));
});

test("날짜 계산은 ctx.now 기준이고 한국어 날짜를 읽는다", async () => {
  const now = "2026-09-24T12:00:00Z";
  assert.equal(parseDate("3월 4일", now).toISOString().slice(0, 10), "2026-03-04");
  assert.equal(parseDate("2026년 12월 25일", now).toISOString().slice(0, 10), "2026-12-25");
  assert.equal(parseDate("내일", now).toISOString().slice(0, 10), "2026-09-25");
  assert.deepEqual(parseOffset("10일 전"), { n: 10, unit: "day", sign: -1 });
  assert.deepEqual(parseOffset("3주 후"), { n: 3, unit: "week", sign: 1 });
  const r = await TOOL.date_math.run({ date: "3월 4일", offset: "3주 후" }, { now });
  assert.equal(r.data.date, "2026-03-25");
  assert.match(r.observation, /2026년 3월 25일/);
  // 2026-09-24는 목요일: 주말은 +2, +3
  assert.deepEqual(weatherDays("weekend", now), [2, 3]);
});

test("notes: 한국어 조사를 떼고 검색한다", async () => {
  const n = memoryNotes(["내 북클럽 모임은 목요일 저녁 7시야", "헬스장 사물함 번호는 4417"]);
  const hits = searchNotes(await n.all(), "북클럽 모임");
  assert.equal(hits.length, 1);
  assert.match(hits[0].text, /북클럽/);
  const r = await TOOL.note_delete.run({ query: "모든 메모" }, { notes: n });
  assert.equal(r.data.deleted, 2);
});

test("wikidata: 최신 statement 선택과 문장 자르기", () => {
  const st = (v, rank = "normal", q = []) => ({ rank, value: { type: "value", content: v }, qualifiers: q, property: { data_type: "string" } });
  const t = (y) => [{ property: { id: "P585" }, value: { content: { time: `+${y}-01-01T00:00:00Z` } } }];
  assert.deepEqual(currentStatements([st("a", "normal", t(2010)), st("b", "normal", t(2020))]).map((s) => s.value.content), ["b"]);
  assert.deepEqual(currentStatements([st("old", "normal", [{ property: { id: "P582" }, value: { content: { time: "+1900" } } }]), st("new")]).map((s) => s.value.content), ["new"]);
  assert.deepEqual(currentStatements([st("x"), st("y", "preferred")]).map((s) => s.value.content), ["y"]);
  assert.equal(firstSentences("폭은 1.6 km이다. 1937년에 문을 열었다. 더 있다.", 2), "폭은 1.6 km이다. 1937년에 문을 열었다.");
});

test("registry: 부작용 도구 3개, 12개 선택지, 짧은 설명", () => {
  assert.equal(TOOLS.length, 12);
  assert.deepEqual(TOOLS.filter((t) => t.sideEffect).map((t) => t.id).sort(), ["note_delete", "note_save", "send_message"]);
  for (const t of TOOLS) assert.ok(t.whenToUse.split(" ").length <= 18, `${t.id}: whenToUse가 공유 head에 너무 길다`);
  assert.equal(guard("send_message").confirm, true);
  assert.equal(guard("weather").confirm, false);
});

// ---- 한국어 추출과 상태 ---------------------------------------------------------------------------------------------
test("ko: 조사 분리와 인용문 추출", () => {
  assert.deepEqual(splitParticle("에펠탑이"), { base: "에펠탑", particle: "이" });
  assert.deepEqual(splitParticle("파리"), { base: "파리", particle: "" });
  assert.deepEqual(clauses("내 북클럽 모임은 목요일이라고 기억해줘"), ["내 북클럽 모임은 목요일"]);
  assert.deepEqual(clauses("프리야에게 늦는다고 메시지 보내줘"), ["늦는다"]);
  assert.deepEqual(clauses("메모해줘: 우유 사기"), ["우유 사기"]);
  assert.ok(arithmetic("2,450의 18%는 얼마야?").includes("2,450의 18%"));
  assert.ok(arithmetic("2의 10제곱은?").includes("2의 10제곱"));
});

test("candidates: 목표와 관찰에서 다단계 후보를 찾고 NONE을 항상 넣는다", () => {
  const c = extractCandidates(nlp, "교토가 있는 나라의 인구는?", "교토는 일본 간사이 지방의 도시이다. 교토시의 인구는 146만 명이다.");
  const ent = slotOptions(TOOL.wikidata_fact.slots[0], c);
  assert.ok("일본" in ent, `후보: ${Object.keys(ent).join(" | ")}`);
  assert.ok(NONE in ent);
  const calc = slotOptions(TOOL.calculator.slots[0], extractCandidates(nlp, "2,450의 18%는 얼마야?"));
  assert.ok("2,450의 18%" in calc);
  const msg = extractCandidates(nlp, "프리야에게 늦는다고 메시지 보내줘");
  assert.ok("프리야" in slotOptions(TOOL.send_message.slots[0], msg));
  assert.ok("늦는다" in slotOptions(TOOL.send_message.slots[1], msg));
  const w = extractCandidates(nlp, "리스본 내일 날씨 알려줘");
  assert.ok("리스본" in slotOptions(TOOL.weather.slots[0], w));
  assert.ok(Object.keys(ent).length <= 20);
  // 처소 조사가 붙은 명사도 장소 후보가 된다
  assert.ok(nounSpans("파리에서 만나자").some((x) => x.span === "파리" && x.kind === "place"));
});

test("state: 필드마다 고정 토큰 예산", () => {
  const long = "단어 ".repeat(500);
  const s = buildState("목표", [{ action: "wiki_lookup", args: { topic: "X" }, observation: long }]);
  assert.ok(s.last_observation.length < long.length);
  assert.ok(s.last_observation.endsWith("…"));
  assert.equal(truncateTokens("짧음", 10), "짧음");
  assert.deepEqual(buildState("g").steps_done, []);
});

// ---- 게이트 ---------------------------------------------------------------------------------------------------------
const choice = (probs) => { const choice = Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0]; return { type: "choice", choice, probabilities: probs, confidence: 0.1 }; };
const noul = (p) => ({ type: "noul", noul: p, confidence: Math.max(p, 1 - p) });

test("gate: 확신하면 AUTO, 아니면 이유와 함께 HOLD", () => {
  const base = { next_action: choice({ weather: 0.8, wiki_lookup: 0.2 }), goal_met: noul(0.1), risky: noul(0.1), "arg:place": choice({ 리스본: 0.9, NONE: 0.1 }), "arg:when": choice({ tomorrow: 0.7, today: 0.3 }) };
  assert.equal(route(base, { stepIndex: 0 }).route, "AUTO");
  const none = { ...base, "arg:place": choice({ NONE: 0.9, 파리: 0.1 }) };
  const r = route(none, { stepIndex: 0 });
  assert.equal(r.route, "HOLD");
  assert.match(r.reasons.join(), /표현 중 맞는 것이 없음/);
  const low = { ...base, next_action: choice({ weather: 0.25, wiki_lookup: 0.2, calculator: 0.2 }) };
  assert.match(route(low, { stepIndex: 0 }).reasons.join(), /행동 점수/);
  assert.match(route({ ...base, goal_met: noul(0.9) }, { stepIndex: 1 }, { strictGoalMet: true }).reasons.join(), /목표 달성/);
  const stop = route({ ...base, goal_met: noul(0.9) }, { stepIndex: 1 });
  assert.equal(stop.route, "AUTO");
  assert.equal(stop.proposal.action, "FINISH");
  assert.match(route(base, { stepIndex: 1, previous: { action: "weather", args: { place: "리스본", when: "tomorrow" } } }).reasons.join(), /반복 방지/);
  assert.match(route({ ...base, risky: noul(0.8) }, { stepIndex: 0 }).reasons.join(), /위험/);
  assert.equal(score(choice({ a: 0.6, b: 0.3, c: 0.1 }), "margin").toFixed(2), "0.30");
});

// ---- 모의 System 1로 돌린 에이전트 루프 ---------------------------------------------------------------------------
function mockLaya(script) {
  // script: 단계마다 { action, p, args: { slot: [value, p] }, goalMet, risky }
  let step = -1;
  return {
    async systemOne(state, qs) {
      const answers = {};
      if (qs.risky) return { answers: { risky: noul(script[0].risky ?? 0.1) }, latency_ms: 1 };
      if (qs.next_action) {
        step = state.steps_done.length;
        const s = script[step];
        const keys = Object.keys(qs.next_action.criteria);
        const rest = (1 - s.p) / (keys.length - 1);
        answers.next_action = choice(Object.fromEntries(keys.map((k) => [k, k === s.action ? s.p : rest])));
        if (qs.goal_met) answers.goal_met = noul(s.goalMet ?? 0.1);
      }
      for (const [k, q] of Object.entries(qs)) {
        if (!k.startsWith("arg:")) continue;
        const [v, p] = script[step].args?.[k.slice(4)] || [NONE, 0.9];
        const keys = Object.keys(q.criteria);
        const pick = keys.includes(v) ? v : NONE;
        answers[k] = choice(Object.fromEntries(keys.map((o) => [o, o === pick ? p : (1 - p) / Math.max(1, keys.length - 1)])));
      }
      return { answers, latency_ms: 5 };
    },
  };
}
const fakeTools = { now: "2026-09-24T12:00:00Z", notes: memoryNotes([]) };

test("agent: 확신하는 단계는 System 1이 실행하고 목표에 답한다", async () => {
  const laya = mockLaya([{ action: "calculator", p: 0.9, args: { expression: ["2,450의 18%", 0.95] } }, { action: "FINISH", p: 0.9, goalMet: 0.9 }]);
  const human = { decide: async () => assert.fail("사람이 필요 없어야 한다"), confirm: async () => assert.fail("확인이 필요 없어야 한다") };
  const run = await runAgent("2,450의 18%는 얼마야?", { laya, nlp, human, toolCtx: fakeTools });
  assert.equal(run.outcome.kind, "answered");
  assert.match(run.outcome.text, /441/);
  assert.deepEqual(run.steps.map((s) => s.decidedBy), ["S1", "S1"]);
});

test("agent: HOLD는 System 2로, 없으면 사람으로 간다", async () => {
  const script = [{ action: "wikidata_fact", p: 0.9, args: { entity: [NONE, 0.8], property: ["height", 0.9] } }, { action: "FINISH", p: 0.9, goalMet: 0.9 }];
  const s2 = { ready: () => true, decide: async () => ({ action: "calculator", args: { expression: "2+2" }, reason: "테스트", ms: 1 }) };
  const human = { decide: async () => ({ action: "calculator", args: { expression: "3+3" } }), confirm: async () => true };
  const a = await runAgent("파리에 있는 그 철탑은 얼마나 높아?", { laya: mockLaya(script), nlp, human, s2, toolCtx: fakeTools });
  assert.equal(a.steps[0].decidedBy, "S2");
  assert.equal(a.steps[0].s2.agreedWithS1, false);
  const b = await runAgent("파리에 있는 그 철탑은 얼마나 높아?", { laya: mockLaya(script), nlp, human, toolCtx: fakeTools });
  assert.equal(b.steps[0].decidedBy, "human");
  assert.match(b.outcome.text, /= 6/);
});

test("agent: 무언가를 바꾸는 도구는 승인이 필요하고, 거부하면 멈춘다", async () => {
  const script = [{ action: "send_message", p: 0.95, args: { to: ["프리야", 0.9], text: ["늦는다", 0.9] }, risky: 0.9 }, { action: "FINISH", p: 0.9, goalMet: 0.9 }];
  let asked = 0;
  const refuse = await runAgent("프리야에게 늦는다고 메시지 보내줘", { laya: mockLaya(script), nlp, human: { decide: async () => null, confirm: async () => { asked++; return false; } }, toolCtx: fakeTools });
  assert.equal(asked, 1);
  assert.equal(refuse.outcome.kind, "refused");
  assert.equal(refuse.steps[0].guard.allowed, false);
  const allow = await runAgent("프리야에게 늦는다고 메시지 보내줘", { laya: mockLaya(script), nlp, human: { decide: async () => null, confirm: async () => true }, toolCtx: fakeTools });
  assert.equal(allow.outcome.kind, "answered");
  assert.match(allow.outcome.text, /실제로 전송되지 않았습니다/);
});

test("agent: what-if 재실행은 앞 단계를 그대로 쓰고 행동을 강제한다", async () => {
  const script = [{ action: "calculator", p: 0.9, args: { expression: ["2,450의 18%", 0.95] } }, { action: "FINISH", p: 0.9, goalMet: 0.9 }];
  const human = { decide: async () => null, confirm: async () => true };
  const first = await runAgent("2,450의 18%는 얼마야?", { laya: mockLaya(script), nlp, human, toolCtx: fakeTools });
  const again = await runAgent("2,450의 18%는 얼마야?", { laya: mockLaya(script), nlp, human, toolCtx: fakeTools }, { prefix: first.steps.slice(0, 1), force: { action: "FINISH" } });
  assert.equal(again.steps[0].replayed, true);
  assert.equal(again.steps[1].action, "FINISH");
  assert.equal(again.steps[1].s1.answers.next_action.forced, true);
  const rr = reroute(first, { ...DEFAULTS, tauAction: 0.99 });
  assert.deepEqual(rr, ["HOLD", "HOLD"]);
  assert.match(toTurtle(compactRun(first)), /la:decidedBy la:S1/);
});

test("agent: 똑같은 호출은 다시 하지 않고 지금까지 찾은 것으로 끝난다", async () => {
  const script = [{ action: "calculator", p: 0.2, args: { expression: ["2,450의 18%", 0.95] } }, { action: "calculator", p: 0.2, args: { expression: ["2,450의 18%", 0.95] } }];
  const s2 = { ready: () => true, decide: async () => ({ action: "calculator", args: { expression: "2,450의 18%" }, reason: "", ms: 1 }) };
  const run = await runAgent("2,450의 18%는 얼마야?", { laya: mockLaya(script), nlp, s2, human: { decide: async () => null, confirm: async () => true }, toolCtx: fakeTools });
  assert.equal(run.steps.length, 2);
  assert.equal(run.steps[1].action, "FINISH");
  assert.ok(run.steps[1].repeatOf);
  assert.match(run.outcome.text, /441/);
});

// ---- 정답 매칭과 지표 ----------------------------------------------------------------------------------------------
test("gold: 대안, 식의 값, 수량 비교", () => {
  assert.ok(argMatch("expression", "0.18 * 2450", "2,450의 18%"));
  assert.ok(argMatch("quantity", "330미터", "330 m"));
  assert.ok(argMatch("entity", "Apple Inc", ["Apple Inc.", "Apple"]));
  assert.ok(!argMatch("entity", NONE, "일본"));
  assert.equal(goldOption("entity", { 교토: null, 일본: null, NONE: "x" }, "일본"), "일본");
  assert.equal(goldOption("entity", { 파리: null, NONE: "x" }, "에펠탑"), NONE);
  const step = { action: "wiki_lookup", args: { topic: "교토" }, alt: [{ action: "wikidata_fact", args: { entity: "교토", property: "country" } }] };
  assert.ok(matchStep(step, { action: "wikidata_fact", args: { entity: "교토", property: "country" } }).ok);
  assert.ok(!matchStep(step, { action: "wikidata_fact", args: { entity: "교토", property: "capital" } }).ok);
});

function rec(task, stepI, gold, s1, extra = {}) {
  return { task, split: extra.split || "test", category: extra.category || "calc", step: stepI, goal: "g", gold, sideEffect: !!extra.sideEffect, s1: { answers: s1, gold: { answers: s1, options: extra.options || {} }, ms: 10 }, ...(extra.s2 ? { s2: { ...extra.s2, ms: 100 } } : {}) };
}

test("metrics: 분담률, 자동 단계 오류, 라우터별 과제 성공률", () => {
  const good = { next_action: choice({ calculator: 0.9, FINISH: 0.1 }), goal_met: noul(0.1), risky: noul(0.1), "arg:expression": choice({ "2+2": 0.9, NONE: 0.1 }) };
  const fin = { next_action: choice({ FINISH: 0.9, calculator: 0.1 }), goal_met: noul(0.9), risky: noul(0.1) };
  const unsure = { next_action: choice({ calculator: 0.2, wiki_lookup: 0.19, weather: 0.18 }), goal_met: noul(0.1), risky: noul(0.1), "arg:expression": choice({ "2+2": 0.9, NONE: 0.1 }) };
  const wrong = { next_action: choice({ weather: 0.9, calculator: 0.1 }), goal_met: noul(0.1), risky: noul(0.1), "arg:place": choice({ 파리: 0.9, NONE: 0.1 }), "arg:when": choice({ today: 0.9, tomorrow: 0.1 }) };
  const g1 = { action: "calculator", args: { expression: "2+2" } }, gF = { action: "FINISH", args: {} };
  const s2ok = { action: "calculator", args: { expression: "2 + 2" } };
  const records = [
    rec("a", 0, g1, good, { s2: s2ok }), rec("a", 1, gF, fin, { s2: gF }),
    rec("b", 0, g1, unsure, { s2: s2ok }), rec("b", 1, gF, fin, { s2: gF }),
    rec("c", 0, g1, wrong, { s2: s2ok }), rec("c", 1, gF, fin, { s2: gF }),
  ];
  const e = evaluate(records, { tauAction: 0.3, tauArg: 0.5 });
  assert.equal(e.split.autoN, 5);
  assert.equal(e.autoError, 1 / 5);
  assert.equal(e.routers.s1.rate, 2 / 3);
  assert.equal(e.routers.hybrid.rate, 2 / 3);
  assert.equal(e.routers.s2.rate, 1);
  assert.equal(e.escalationPrecision, 0);
  const t = taskResults(records, { tauAction: 0.3, tauArg: 0.5 }, "hybrid");
  assert.deepEqual(t.map((x) => x.s2), [0, 1, 0]);
  assert.ok(tuneOnDev(records.map((r) => ({ ...r, split: "dev" })), {}, 0.5));
});

// ---- 과제 세트와 녹음 -----------------------------------------------------------------------------------------------
test("tasks.json: 정답 트레이스가 유효하다", () => {
  assert.ok(tasks.tasks.length >= 60);
  for (const t of tasks.tasks) {
    assert.ok(t.goal.length > 0, `${t.id}: 목표 없음`);
    assert.equal(t.steps.at(-1).action, "FINISH", `${t.id}: FINISH로 끝나야 한다`);
    for (const s of t.steps) {
      assert.ok(TOOL[s.action], `${t.id}: 알 수 없는 행동 ${s.action}`);
      for (const slot of TOOL[s.action].slots) {
        const v = s.args[slot.name];
        assert.ok(v != null, `${t.id}: ${s.action}에 ${slot.name}이(가) 없다`);
        if (slot.fixed) assert.ok((Array.isArray(v) ? v[0] : v) in slot.fixed, `${t.id}: ${slot.name}=${v}는 선택지가 아니다`);
      }
      if (s.action !== "FINISH") assert.ok(s.observation && !/실패:/.test(s.observation), `${t.id}: ${s.action}에 좋은 관찰 결과가 없다`);
    }
  }
  const sides = tasks.tasks.filter((t) => t.steps.some((s) => isSideEffect(s.action)));
  assert.ok(sides.length >= 6);
  assert.ok(tasks.tasks.some((t) => t.split === "dev") && tasks.tasks.some((t) => t.split === "test"));
});

test("질문이 Laya의 head에 들어간다: 모든 선택지에 마커가 생긴다", () => {
  const q = actionQuestions();
  assert.equal(Object.keys(q.next_action.criteria).length, 12);
  const a = argQuestions(TOOL.wikidata_fact, []);
  assert.equal(Object.keys(a["arg:property"].criteria).length, 11);
});

test("System 2: 응답 파싱과 스키마", () => {
  const r = parseReply('{"action":"unit_convert","args":{"quantity":"5마일","to_unit":"킬로미터","extra":"x"},"reason":"r"}');
  assert.deepEqual(r.args, { quantity: "5마일", to_unit: "km" });
  assert.deepEqual(STEP_SCHEMA.properties.action.enum, TOOLS.map((t) => t.id));
  assert.throws(() => parseReply("no json here"));
});

test("recorded.json이 현재 질문·과제와 맞는다", () => {
  const p = new URL("../web/recorded.json", import.meta.url);
  if (!fs.existsSync(p)) return;
  const r = JSON.parse(fs.readFileSync(p, "utf8"));
  if (r.eval?.meta?.questions) assert.equal(r.eval.meta.questions, questionsKey(tasks.tasks), "질문이나 과제가 바뀌었다: 평가를 다시 녹음해야 한다 (README 참고)");
});
