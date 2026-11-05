// 한국어 과제 세트의 정답 트레이스. 도구 출력(observation/answer/source)은 scripts/build_tasks_ko.mjs가
// 실제 도구를 한 번 실행해 채운다 (그래서 나중에 위키백과·Wikidata·날씨가 바뀌어도 점수가 흔들리지 않는다).
//
// steps: { action, args, alt? }  alt = 같은 단계로 인정하는 다른 호출 (gold.js가 대안으로 본다)
// args 값이 배열이면 그중 하나면 정답으로 인정한다.
export const NOW = "2026-09-24T12:00:00Z"; // 2026-09-24는 목요일 (녹음 기준일)

export const SEED_NOTES = [
  "내 북클럽 모임은 목요일 저녁 7시야",
  "치과 예약은 10월 3일 오전 9시",
  "별장 와이파이 비밀번호는 냉장고에 붙어 있어",
  "사라 생일은 6월 12일",
  "헬스장 사물함 번호는 4417",
  "세차 쿠폰은 이번 달 말에 만료돼",
  "회사 주차 자리는 B-14",
];

const T = [];
const add = (id, split, category, goal, steps) => T.push({ id, split, category, goal, steps });

// ---- 날씨 (인자가 목표 안에 있음) ------------------------------------------------------------------------------------
add("k001", "dev", "weather", "리스본 내일 날씨 알려줘", [{ action: "weather", args: { place: "리스본", when: "tomorrow" } }]);
add("k002", "test", "weather", "오사카 이번 주말 날씨는?", [{ action: "weather", args: { place: "오사카", when: "weekend" } }]);
add("k003", "test", "weather", "제주 날씨 알려줘", [{ action: "weather", args: { place: ["제주", "제주도"], when: "today" } }]);
add("k004", "dev", "weather", "런던 오늘 날씨 어때?", [{ action: "weather", args: { place: "런던", when: "today" } }]);
add("k005", "test", "weather", "시드니 앞으로 며칠 날씨 알려줘", [{ action: "weather", args: { place: "시드니", when: "week" } }]);
add("k006", "test", "weather", "뉴욕 내일 날씨는?", [{ action: "weather", args: { place: "뉴욕", when: "tomorrow" } }]);
add("k007", "dev", "weather", "파리 이번 주말 날씨 알려줘", [{ action: "weather", args: { place: "파리", when: "weekend" } }]);
add("k008", "test", "weather", "베를린 오늘 날씨는?", [{ action: "weather", args: { place: "베를린", when: "today" } }]);

// ---- 백과사전 -------------------------------------------------------------------------------------------------------
add("k009", "dev", "wiki", "마리 퀴리에 대해 알려줘", [{ action: "wiki_lookup", args: { topic: "마리 퀴리" } }]);
add("k010", "test", "wiki", "에펠탑이 뭐야?", [{ action: "wiki_lookup", args: { topic: "에펠탑" } }]);
add("k011", "test", "wiki", "교토에 대해 알려줘", [{ action: "wiki_lookup", args: { topic: "교토" } }]);
add("k012", "dev", "wiki", "한강에 대해 알려줘", [{ action: "wiki_lookup", args: { topic: "한강" } }]);
add("k013", "test", "wiki", "블랙홀이 뭐야?", [{ action: "wiki_lookup", args: { topic: "블랙홀" } }]);
add("k014", "test", "wiki", "만리장성에 대해 알려줘", [{ action: "wiki_lookup", args: { topic: "만리장성" } }]);
add("k015", "dev", "wiki", "이순신 장군이 누구야?", [{ action: "wiki_lookup", args: { topic: "이순신" } }]);

// ---- Wikidata 사실 --------------------------------------------------------------------------------------------------
add("k016", "dev", "fact", "캐나다의 인구는?", [{ action: "wikidata_fact", args: { entity: "캐나다", property: "population" } }]);
add("k017", "test", "fact", "마이크로소프트의 CEO는 누구야?", [{ action: "wikidata_fact", args: { entity: "마이크로소프트", property: "ceo" } }]);
add("k018", "test", "fact", "일본의 수도는 어디야?", [{ action: "wikidata_fact", args: { entity: "일본", property: "capital" } }]);
add("k019", "test", "fact", "에펠탑의 높이는?", [{ action: "wikidata_fact", args: { entity: "에펠탑", property: "height" } }]);
add("k020", "dev", "fact", "테슬라의 설립자는?", [{ action: "wikidata_fact", args: { entity: "테슬라", property: "founder" } }]);
add("k021", "test", "fact", "브라질의 통화는?", [{ action: "wikidata_fact", args: { entity: "브라질", property: "currency" } }]);
add("k022", "test", "fact", "삼성전자의 설립 연도는?", [{ action: "wikidata_fact", args: { entity: "삼성전자", property: "founded" } }]);
add("k023", "dev", "fact", "프랑스의 공용어는?", [{ action: "wikidata_fact", args: { entity: "프랑스", property: "official_language" } }]);
add("k024", "test", "fact", "호주의 면적은?", [{ action: "wikidata_fact", args: { entity: "호주", property: "area" } }]);
add("k025", "test", "fact", "애플의 CEO는?", [{ action: "wikidata_fact", args: { entity: "애플", property: "ceo" } }]);

// ---- 산술 -----------------------------------------------------------------------------------------------------------
add("k026", "dev", "calc", "2,450의 18%는 얼마야?", [{ action: "calculator", args: { expression: ["2,450의 18%", "2,450의 18%는"] } }]);
add("k027", "test", "calc", "3 + 4 곱하기 2는?", [{ action: "calculator", args: { expression: "3 + 4 곱하기 2" } }]);
add("k028", "test", "calc", "1,250 곱하기 12는?", [{ action: "calculator", args: { expression: "1,250 곱하기 12" } }]);
add("k029", "test", "calc", "2의 10제곱은?", [{ action: "calculator", args: { expression: "2의 10제곱" } }]);
add("k030", "dev", "calc", "7,200 나누기 16은?", [{ action: "calculator", args: { expression: "7,200 나누기 16" } }]);
add("k031", "test", "calc", "45 더하기 55 곱하기 3은?", [{ action: "calculator", args: { expression: "45 더하기 55 곱하기 3" } }]);

// ---- 단위 변환 ------------------------------------------------------------------------------------------------------
add("k032", "dev", "units", "5마일을 킬로미터로 바꿔줘", [{ action: "unit_convert", args: { quantity: "5마일", to_unit: "km" } }]);
add("k033", "test", "units", "70킬로그램은 몇 파운드야?", [{ action: "unit_convert", args: { quantity: "70킬로그램", to_unit: "lb" } }]);
add("k034", "test", "units", "20도를 화씨로 바꿔줘", [{ action: "unit_convert", args: { quantity: "20도", to_unit: "F" } }]);
add("k035", "test", "units", "100미터는 몇 피트야?", [{ action: "unit_convert", args: { quantity: "100미터", to_unit: "ft" } }]);
add("k036", "dev", "units", "3리터는 몇 갤런이야?", [{ action: "unit_convert", args: { quantity: "3리터", to_unit: "gal" } }]);
add("k037", "test", "units", "2킬로그램은 몇 파운드야?", [{ action: "unit_convert", args: { quantity: "2킬로그램", to_unit: "lb" } }]);

// ---- 날짜 계산 ------------------------------------------------------------------------------------------------------
add("k038", "dev", "date", "3월 4일부터 3주 후는 무슨 날이야?", [{ action: "date_math", args: { date: "3월 4일", offset: "3주 후" } }]);
add("k039", "test", "date", "오늘부터 90일 후는 무슨 날이야?", [{ action: "date_math", args: { date: "오늘", offset: "90일 후" } }]);
add("k040", "test", "date", "2026년 12월 25일에서 10일 전은 무슨 날이야?", [{ action: "date_math", args: { date: "2026년 12월 25일", offset: "10일 전" } }]);
add("k041", "test", "date", "5월 1일부터 2개월 후는?", [{ action: "date_math", args: { date: "5월 1일", offset: "2개월 후" } }]);
add("k042", "dev", "date", "1월 15일부터 30일 후는 무슨 날이야?", [{ action: "date_math", args: { date: "1월 15일", offset: "30일 후" } }]);

// ---- 다단계 (관찰 결과가 다음 인자) ---------------------------------------------------------------------------------
add("k043", "dev", "multihop", "에펠탑이 있는 도시의 이번 주말 날씨는?", [
  { action: "wiki_lookup", args: { topic: "에펠탑" }, alt: [{ action: "wikidata_fact", args: { entity: "에펠탑", property: "country" } }] },
  { action: "weather", args: { place: "파리", when: "weekend" } },
]);
add("k044", "test", "multihop", "교토가 있는 나라의 인구는?", [
  { action: "wiki_lookup", args: { topic: "교토" }, alt: [{ action: "wikidata_fact", args: { entity: "교토", property: "country" } }] },
  { action: "wikidata_fact", args: { entity: ["일본"], property: "population" } },
]);
add("k045", "test", "multihop", "아이폰을 만드는 회사의 CEO는 누구야?", [
  { action: "wiki_lookup", args: { topic: "아이폰" } },
  { action: "wikidata_fact", args: { entity: ["애플"], property: "ceo" } },
]);
add("k046", "dev", "multihop", "도쿄가 있는 나라의 수도는?", [
  { action: "wiki_lookup", args: { topic: "도쿄" }, alt: [{ action: "wikidata_fact", args: { entity: "도쿄", property: "country" } }] },
  { action: "wikidata_fact", args: { entity: ["일본"], property: "capital" } },
]);
add("k047", "test", "multihop", "빌 게이츠가 세운 회사의 CEO는?", [
  { action: "wiki_lookup", args: { topic: "빌 게이츠" } },
  { action: "wikidata_fact", args: { entity: ["마이크로소프트"], property: "ceo" } },
]);
add("k048", "test", "multihop", "만리장성이 있는 나라의 인구는?", [
  { action: "wiki_lookup", args: { topic: "만리장성" }, alt: [{ action: "wikidata_fact", args: { entity: "만리장성", property: "country" } }] },
  { action: "wikidata_fact", args: { entity: ["중국"], property: "population" } },
]);
add("k049", "dev", "multihop", "교토가 있는 나라의 통화는?", [
  { action: "wiki_lookup", args: { topic: "교토" }, alt: [{ action: "wikidata_fact", args: { entity: "교토", property: "country" } }] },
  { action: "wikidata_fact", args: { entity: ["일본"], property: "currency" } },
]);

// ---- 메모리 (저장 / 검색) -------------------------------------------------------------------------------------------
add("k050", "dev", "memory", "내 북클럽 모임은 목요일이라고 기억해줘", [{ action: "note_save", args: { text: ["내 북클럽 모임은 목요일", "북클럽 모임은 목요일"] } }]);
add("k051", "test", "memory", "메모해줘: 우유 사기", [{ action: "note_save", args: { text: ["우유 사기"] } }]);
add("k052", "test", "memory", "별장 와이파이 비밀번호는 냉장고에 붙어 있다고 기억해줘", [{ action: "note_save", args: { text: ["별장 와이파이 비밀번호는 냉장고에 붙어 있다"] } }]);
add("k053", "dev", "memory", "내 북클럽 모임은 언제야?", [{ action: "note_search", args: { query: ["북클럽", "북클럽 모임"] } }]);
add("k054", "test", "memory", "치과 예약이 언제였지?", [{ action: "note_search", args: { query: ["치과", "치과 예약"] } }]);
add("k055", "test", "memory", "헬스장 사물함 번호 알려줘", [{ action: "note_search", args: { query: ["헬스장", "사물함"] } }]);

// ---- 다시 써야 하는 인자 (본문에 없음) -----------------------------------------------------------------------------
add("k056", "test", "rewrite", "파리에 있는 그 철탑은 얼마나 높아?", [{ action: "wikidata_fact", args: { entity: ["에펠탑"], property: "height" }, alt: [{ action: "wiki_lookup", args: { topic: "에펠탑" } }] }]);
add("k057", "test", "rewrite", "아이폰을 만든 회사의 설립자는 누구야?", [{ action: "wikidata_fact", args: { entity: ["애플"], property: "founder" } }]);
add("k058", "dev", "rewrite", "세계에서 가장 긴 강은 어디야?", [{ action: "wiki_lookup", args: { topic: ["나일강", "나일"] } }]);
add("k059", "test", "rewrite", "그 전기차 회사의 CEO는 누구야?", [{ action: "wikidata_fact", args: { entity: ["테슬라"], property: "ceo" } }]);

// ---- 모호함 (되물어야 함) ------------------------------------------------------------------------------------------
add("k060", "test", "ambiguous", "날씨 알려줘", [
  { action: "ask_user", args: {} },
  { action: "weather", args: { place: ["서울"], when: "today" } },
]);
add("k061", "test", "ambiguous", "거기 내일 날씨 어때?", [
  { action: "ask_user", args: {} },
  { action: "weather", args: { place: ["부산"], when: "tomorrow" } },
]);
add("k062", "dev", "ambiguous", "메모 찾아줘", [
  { action: "ask_user", args: {} },
  { action: "note_search", args: { query: ["세차", "세차 쿠폰"] } },
]);
add("k063", "test", "ambiguous", "그 사람 생일 알려줘", [
  { action: "ask_user", args: {} },
  { action: "note_search", args: { query: ["사라", "사라 생일"] } },
]);

// ---- 무언가를 바꿈 (가드가 매번 확인) -----------------------------------------------------------------------------
add("k064", "test", "risky", "치과 관련 메모를 모두 지워줘", [{ action: "note_delete", args: { query: ["치과", "치과 예약"] } }]);
add("k065", "test", "risky", "내 메모를 전부 지워줘", [{ action: "note_delete", args: { query: "모든 메모" } }]);
add("k066", "dev", "risky", "프리야에게 늦는다고 메시지 보내줘", [{ action: "send_message", args: { to: "프리야", text: ["늦는다"] } }]);
add("k067", "test", "risky", "사라에게 생일 축하한다고 전해줘", [{ action: "send_message", args: { to: "사라", text: ["생일 축하한다"] } }]);
add("k068", "test", "risky", "회사 주차 자리 메모를 지워줘", [{ action: "note_delete", args: { query: ["주차", "회사 주차"] } }]);

export const TASKS = T;
export const AMBIGUOUS_ANSWERS = { k060: "서울", k061: "부산", k062: "세차 쿠폰", k063: "사라" };
