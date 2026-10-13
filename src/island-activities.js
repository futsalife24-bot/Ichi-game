// ８つの しまの あそび。えと ものを うごかして たしかめる。
const A = (id, title, type, icon, assets, data = {}) => ({ id, island: Number(id.slice(1, 3)), help: id.includes('-H'), title, type, icon, assets, ...data });

export const ISLAND_ACTIVITIES = [
  A('I01-Q01','あかい ふうせんは どれ？','pick','🎈',['cmBalloon'],{choices:['🔴','🔵'],answer:'🔴',sample:'🔴 🎈'}),
  A('I01-Q02','りんごを ３こ あつめよう','collect','🍎',['cmFruit','cmTray'],{total:5,target:3}),
  A('I01-Q03','まると おなじ かたちは どれ？','pick','🔵',['cmShape'],{choices:['●','▲'],answer:'●',sample:'●'}),
  A('I01-Q04','もーもーは だあれ？','pick','🐄',['cmActors'],{choices:['🐄','🐕'],answer:'🐄',sample:'🐄 もーもー'}),
  A('I01-H01','ひよこに りんごを ２こ とどける','deliver','🍎',['cmActors','cmFruit','i01PicnicMat','cmTray'],{total:3,target:2,steps:['🍎 あつめる','🐥 とどける']}),
  A('I01-H02','かいがらを おさらへ はこぶ','collect','🐚',['cmCritters','cmTray'],{total:3,target:3}),
  A('I02-Q01','３と おなじ りんごの おさら','pick','🍎',['cmFruit','cmTray','cmCard'],{choices:['🍎 🍎','🍎 🍎 🍎','🍎 🍎 🍎 🍎'],answer:'🍎 🍎 🍎',sample:'3 ● ● ●'}),
  A('I02-Q02','あかい ものを あつめよう','sort','🔴',['cmFruit','cmBasket','cmShape'],{items:['🔴','🔵','🔴','🔵'],target:'🔴'}),
  A('I02-Q03','Aと おなじ カード','pick','🅰️',['cmCard','i02School'],{choices:['A','B','C'],answer:'A',sample:'A'}),
  A('I02-H01','みほんどおりに おさらを ならべる','sequence','🍽️',['cmActors','cmTray','i02School'],{items:['🍎','🍐','🍋'],order:['🍎','🍐','🍋'],sample:'🍎 → 🍐 → 🍋'}),
  A('I02-H02','おちたりんごを かごへ','collect','🍎',['i02RoundTree','cmFruit','cmBasket'],{total:3,target:3,requiresShake:true,steps:['🌳 ゆらす','🍎 あつめる']}),
  A('I03-Q01','４こと ２こ、どちらが おおい？','pick','🍎',['cmFruit','cmTray'],{choices:['🍎 🍎 🍎 🍎','🍎 🍎'],answer:'🍎 🍎 🍎 🍎',sample:'🍎 🍎 🍎 🍎　／　🍎 🍎'}),
  A('I03-Q02','１・２・□・４','pick','🔢',['cmCard','cmFruit'],{choices:['2 ●●','3 ●●●','4 ●●●●'],answer:'3 ●●●',sample:'1 ● → 2 ●● → □ → 4 ●●●●'}),
  A('I03-Q03','りんごと apple','pick','🍎',['cmCard','cmFruit','cmActors'],{choices:['apple','cat','red'],answer:'apple',sample:'🍎 apple',english:'apple'}),
  A('I03-H01','あかい はなを ３ぼん とどける','deliver','🌹',['cmPlants','cmBasket','i03House','i03ReceivingBox'],{total:5,target:3,steps:['🌹 えらぶ','🏠 とどける']}),
  A('I03-H02','おさらを ３こと ３こに','distribute','🥖',['cmBread','cmTray','i03Bakery'],{total:6,targets:[3,3]}),
  A('I03-H03','かえるさんに はっぱを ３まい','deliver','🍃',['cmActors','i03GreenLeaf','i03AmberLeaf','i03RedLeaf'],{total:4,target:3,steps:['🍃 あつめる','🐸 とどける']}),
  A('I04-Q01','さんかく ２まいで しかく','compose','◢',['i04Triangle','i04BuildBase','cmShape'],{pieces:['◢','◤'],solutions:[['◢','◤'],['◤','◢']],sample:'◢ ＋ ◤ → ■',english:'triangle'}),
  A('I04-Q02','あか・あお・あか・あお','pattern','🔴',['cmShape','i04WorkTable'],{sample:'🔴 🔵 🔴 🔵 □',choices:['🔴','🔵'],answer:'🔴',english:'red, blue'}),
  A('I04-Q03','はしに とどく いた','compare-place','🪵',['i04Plank','i04Post','i04BuildBase'],{choices:['▰','━━━━'],answer:'━━━━',sample:'┃　　┃',slots:2}),
  A('I04-Q04','12この みほんと おなじ かず','collect','🍎',['cmFruit','cmTray','cmCard'],{total:20,target:12,sample:'🍎🍎🍎🍎🍎　🍎🍎🍎🍎🍎　🍎🍎'}),
  A('I04-H01','おうちの やねと かべ','compose','🏠',['i04HouseBlocks','i04BuildBase','cmPlanBoard'],{pieces:['🔺','🟦','🟨'],solutions:[['🔺','🟦'],['🔺','🟨'],['🟦','🔺'],['🟨','🔺']]}),
  A('I04-H02','ながい いたと みじかい いた','sort-two','🪵',['i04Plank','i04Shelf','cmCard'],{items:['━━━━','▰','━━━━','▰'],targets:['━━━━','▰']}),
  A('I05-Q01','３こと ２こを あわせる','combine','🍎',['cmFruit','cmTray','i05Counter'],{groups:[3,2],target:5}),
  A('I05-Q02','４こを ふたりに わける','distribute','🍎',['cmActors','cmFruit','cmTray'],{total:4,targets:[2,2]}),
  A('I05-Q03','えの リストで おかいもの','shopping','🧺',['cmPlanBoard','cmFruit','cmTicket','i05Stall'],{items:['🍎','🍐','🍎'],order:['🍎','🍐','🍎'],sample:'📝 🍎 → 🍐 → 🍎',english:'red apple'}),
  A('I05-H01','おやつを ５こ そろえる','combine','🥖',['cmBasket','cmBread','cmTray'],{groups:[3,2],target:5}),
  A('I05-H02','おきゃくさんに ひとつずつ','distribute','🍎',['cmActors','cmCrate','cmFruit','i05Stall'],{total:3,targets:[1,1,1],english:'Thank you'}),
  A('I06-Q01','５こから ２こ わたす','subtract','🍎',['cmFruit','cmTray','cmActors'],{total:5,take:2,remainingChoices:[2,3,4]}),
  A('I06-Q02','みずを あげた はな','observe','🌼',['i06Planter','cmPlants','cmWateringCan','i06ObservationDome'],{choices:['🌱','🌼'],result:'🌼',before:'🌱　🌱',after:'💧🌼　🌱',conditions:['💧 みず','☀️ そのまま'],timeNote:'この あそびでは すぐに へんかが みえるよ。ほんとうの はなは もっと ゆっくり そだつよ。',english:'water the flower'}),
  A('I06-Q03','おもり ３こと １こ','observe','⚪',['i06Balance','i06Weight','i06ExperimentTable'],{choices:['ひだり','みぎ'],result:'ひだり',sample:'⚪⚪⚪　⚖️　⚪',english:'heavy and light'}),
  A('I06-Q04','かぜと はね','observe','🌀',['i06Windmill','i06ObservationDome'],{choices:['とまる','まわる'],result:'まわる'}),
  A('I06-H01','ふたつの はなを くらべる','observe','🌷',['i06Planter','cmPlants','cmWateringCan','cmPlanBoard'],{choices:['🌱','🌷'],result:'🌷',before:'🌱　🌱',after:'💧🌷　🌱',conditions:['💧 みず','☀️ そのまま'],timeNote:'みずだけ ちがうよ。ほんとうの はなは ゆっくり そだつよ。'}),
  A('I06-H02','しゅうかくして とどける','deliver','🥕',['i06Bed','cmPlants','cmBasket','cmTray','cmActors'],{total:5,target:2,steps:['🥕 とる','👧 ２こ とどける','🧺 のこりを みる']}),
  A('I07-Q01','10こを ３こと のこりに','distribute','🍎',['cmFruit','cmTray','cmCrate'],{total:10,targets:[3,7]}),
  A('I07-Q02','えの ちずの みち','map-path','🗺️',['cmPlanBoard','cmSign','i07Waystone','i07Bridge','i07SkyGround','i07Clouds'],{map:['🏠','🪨','🌳','🌼','🌉','🌳','🌳','⛺','🌳'],routes:[[1,4,7],[3,4,7]],slots:9,sample:'🏠 から 🌉 を とおって ⛺ へ'}),
  A('I07-Q03','おてつだいの えを ならべる','sequence','🧭',['cmCard','cmPlanBoard'],{items:['🎒','🌉','⛺'],order:['🎒','🌉','⛺'],sample:'🎒 → 🌉 → ⛺'}),
  A('I07-H01','じゅんび→はし→テント','path','🎒',['i07Pack','i07Bridge','i07Tent','cmPlanBoard','cmActors'],{items:['🎒','🌉','⛺'],order:['🎒','🌉','⛺'],sample:'🎒 → 🌉 → ⛺',english:'Go to the bridge'}),
  A('I07-H02','２かしょへ わけて はこぶ','distribute','🧺',['cmBasket','cmCrate','i07Waystone','i07Tent'],{total:8,targets:[3,5]}),
  A('I08-Q01','５にんと パン３こ','collect','🥖',['cmActors','cmBread','cmTray','i08Table'],{total:5,target:2,sample:'👧👦👧👦👧　🥖🥖🥖　あと いくつ？'}),
  A('I08-Q02','みんなが とおれる ならべかた','arrange','🪑',['i08Table','cmChair','i08Arch','cmPlanBoard'],{slots:6,blocked:[2,3],pieces:2}),
  A('I08-Q03','にんずうと おなじ いす','collect','🪑',['cmActors','cmChair','i08Table'],{total:6,target:4}),
  A('I08-H01','じぶんの おまつり','festival','🎪',['cmPlanBoard','i08Stage','i08Canopy','i08Bunting','i08Gift','cmActors'],{plans:['🎪','🎵'],guests:3,reflections:['😊','🤝'],steps:['🎪 えらぶ','🎁 じゅんび','👧👦👧 くばる','💬 おはなし'],sample:'🎪／🎵 → 🎁 → 👧👦👧 → 💬',english:'I like it'}),
  A('I08-H02','みんなで かたづける','sort-two','🧺',['i08CleanupBin','cmCrate','cmCard','cmActors'],{items:['🎁','🥖','🎁','🥖'],targets:['🎁','🥖']}),
];

export const activityById = (id) => ISLAND_ACTIVITIES.find((item) => item.id === id) ?? null;
const bounded = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
export function initialActivityState(id) {
  const a = activityById(id);
  if (!a) throw new RangeError('あそびが ありません');
  return { id, phase: 0, guideStage: 0, picks: [], bins: a.targets?.map(() => 0) ?? (a.type === 'sort' ? [0] : []), placed: [], prediction: '', observed: false, done: false };
}
export function validIslandActivityState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const a = activityById(value.id);
  const maxPick = a?.items?.length ?? a?.pieces?.length ?? a?.guests ?? a?.total ?? a?.groups?.[1] ?? 0;
  const base = Boolean(a && bounded(value.phase, 4) && bounded(value.guideStage, 2) && Array.isArray(value.picks) && value.picks.length <= 24 && value.picks.every((n) => bounded(n, maxPick - 1)) && new Set(value.picks).size === value.picks.length
    && Array.isArray(value.bins) && value.bins.length <= 4 && value.bins.every((n) => bounded(n, 20))
    && Array.isArray(value.placed) && value.placed.length <= 20 && value.placed.every((n) => bounded(n, (a.slots ?? 0) - 1)) && new Set(value.placed).size === value.placed.length
    && typeof value.prediction === 'string' && value.prediction.length <= 20 && typeof value.observed === 'boolean' && typeof value.done === 'boolean');
  if (!base) return false;
  if (a.type === 'map-path' && !a.routes.some((route) => value.placed.every((n,i) => route[i] === n))) return false;
  if (a.type === 'arrange' && value.placed.some((n) => a.blocked.includes(n))) return false;
  if (['sort','sort-two','distribute'].includes(a.type)) {
    const expectedLength = a.type === 'sort' ? 1 : a.targets.length;
    if (value.bins.length !== expectedLength || value.bins.reduce((n,m) => n+m,0) !== value.picks.length) return false;
    if (a.type === 'distribute' && value.bins.some((n,i) => n > a.targets[i])) return false;
  }
  if (a.type === 'observe' && (value.prediction && !a.choices.includes(value.prediction) || value.observed && !value.prediction)) return false;
  if (a.type === 'festival' && (value.prediction && !a.plans.some((plan) => value.prediction.startsWith(plan)) || value.phase === 0 && value.prediction || value.phase < 2 && value.picks.length)) return false;
  if (a.requiresShake && value.phase === 0 && value.picks.length) return false;
  if (a.type === 'subtract' && value.phase === 1 && value.picks.length !== a.take) return false;
  if (a.type === 'deliver' && a.steps?.length === 3) {
    if (!bounded(value.phase, 2)) return false;
    if (value.bins.length > a.total - a.target || value.bins.some((n) => !bounded(n, a.total - 1) || value.picks.includes(n)) || new Set(value.bins).size !== value.bins.length) return false;
    if (value.phase === 0 && value.bins.length) return false;
    if (value.phase >= 1 && value.picks.length !== a.target) return false;
    if (value.phase === 1 && value.bins.length === a.total - a.target) return false;
    if (value.done !== (value.phase === 2 && value.bins.length === a.total - a.target)) return false;
  }
  return true;
}
export function validIslandActivityProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.version !== 1 || !Array.isArray(value.completed) || value.completed.length > ISLAND_ACTIVITIES.length) return false;
  if (!value.completed.every((id) => typeof id === 'string' && activityById(id)) || new Set(value.completed).size !== value.completed.length) return false;
  if (value.decor !== undefined && !validIslandActivityDecor(value.decor)) return false;
  return value.current === null || validIslandActivityState(value.current);
}
export function validIslandActivityDecor(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && value.version === 1
    && (value.festivalPlan === null || value.festivalPlan === 'picnic' || value.festivalPlan === 'music')
    && Array.isArray(value.chairs) && value.chairs.length <= 2
    && value.chairs.every((n) => bounded(n, 5) && n !== 2 && n !== 3)
    && new Set(value.chairs).size === value.chairs.length);
}
export function validateIslandActivityProgress(value) {
  if (value === undefined || value === null) return { version: 1, completed: [], current: null };
  if (!validIslandActivityProgress(value)) throw new TypeError('あそびの きろくが こわれています');
  return { version: 1, completed: [...value.completed], current: value.current ? { ...value.current, picks: [...value.current.picks], bins: [...value.current.bins], placed: [...value.current.placed] } : null,
    ...(value.decor === undefined ? {} : { decor: { ...value.decor, chairs: [...value.decor.chairs] } }) };
}

export function playIslandActivity(a, state, action) {
  if (!a || !validIslandActivityState(state) || a.id !== state.id || state.done) return { state, result: 'invalid' };
  const next = { ...state, picks: [...state.picks], bins: [...state.bins], placed: [...state.placed] };
  const wrong = () => ({ state: next, result: 'retry' });
  const success = () => { next.done = true; return { state: next, result: 'done' }; };
  if (action.type === 'guide' && bounded(action.stage, 2)) { next.guideStage = action.stage; return { state: next, result: 'progress' }; }
  const type = a.type;
  if (type === 'festival') {
    if (action.type === 'plan' && next.phase === 0 && a.plans.includes(action.value)) { next.prediction = action.value; next.phase = 1; return {state:next,result:'progress'}; }
    if (action.type === 'prepare' && next.phase === 1) { next.phase = 2; return {state:next,result:'progress'}; }
    if (action.type === 'give' && next.phase === 2 && bounded(action.index,a.guests-1) && !next.picks.includes(action.index)) {
      next.picks.push(action.index); if (next.picks.length === a.guests) next.phase = 3;
      return {state:next,result:'progress'};
    }
    if (action.type === 'reflect' && next.phase === 3 && a.reflections.includes(action.value)) { next.prediction += action.value; return success(); }
    return wrong();
  }
  if (type === 'map-path') {
    if (action.type !== 'put' || !bounded(action.index,a.map.length-1) || next.placed.includes(action.index)) return wrong();
    const proposed = [...next.placed, action.index];
    if (!a.routes.some((route) => proposed.every((n,i) => route[i] === n))) return wrong();
    next.placed = proposed;
    return a.routes.some((route) => route.length === proposed.length && route.every((n,i) => proposed[i] === n)) ? success() : {state:next,result:'progress'};
  }
  if (type === 'pick' || type === 'pattern') return action.value === a.answer ? success() : wrong();
  if (type === 'compare-place') {
    if (action.type === 'place' && bounded(action.index, a.choices.length - 1)) { next.placed = [action.index]; return { state: next, result:'progress' }; }
    return action.type === 'check' && a.choices[next.placed[0]] === a.answer ? success() : wrong();
  }
  if (type === 'collect' || type === 'deliver' || type === 'combine' || type === 'subtract') {
    if (a.requiresShake && action.type === 'shake' && next.phase === 0) { next.phase = 1; return {state:next,result:'progress'}; }
    if (a.requiresShake && next.phase === 0) return wrong();
    if (action.type === 'return' && ['collect','deliver','subtract'].includes(type) && (type === 'collect' || next.phase === 0)) {
      const at = next.picks.indexOf(action.index);
      if (at < 0) return wrong();
      next.picks.splice(at,1);
      return {state:next,result:'progress'};
    }
    if (action.type === 'take') {
      if ((type === 'subtract' || type === 'deliver') && next.phase !== 0) return wrong();
      const max = type === 'combine' ? a.groups[1] : a.total;
      if (!bounded(action.index, max - 1) || next.picks.includes(action.index)) return wrong();
      next.picks.push(action.index);
      return { state: next, result: 'progress' };
    }
    if (type === 'deliver' && action.type === 'deliver' && next.phase === 0 && next.picks.length === a.target) {
      next.phase = 1;
      return a.steps?.length === 3 ? {state:next,result:'progress'} : success();
    }
    if (type === 'deliver' && a.steps?.length === 3 && action.type === 'store' && next.phase === 1) {
      if (!bounded(action.index, a.total - 1) || next.picks.includes(action.index) || next.bins.includes(action.index)) return wrong();
      next.bins.push(action.index);
      if (next.bins.length === a.total - a.target) { next.phase = 2; return success(); }
      return {state:next,result:'progress'};
    }
    if (type === 'subtract' && action.type === 'remaining' && next.phase === 1) return action.value === a.total - a.take ? success() : wrong();
    if (action.type === 'check') {
      const expected = type === 'subtract' ? a.take : type === 'combine' ? a.groups[1] : a.target;
      if (type === 'subtract' && next.phase === 0 && next.picks.length === expected) { next.phase = 1; return {state:next,result:'progress'}; }
      return next.picks.length === expected && type !== 'deliver' && type !== 'subtract' ? success() : wrong();
    }
    return wrong();
  }
  if (type === 'sort' || type === 'sort-two' || type === 'distribute') {
    if (action.type !== 'put' || !bounded(action.index, (a.items?.length ?? a.total) - 1) || next.picks.includes(action.index)) return wrong();
    const target = type === 'sort' ? 0 : type === 'sort-two' ? a.targets.indexOf(a.items[action.index]) : action.bin;
    if (!bounded(action.bin, type === 'sort' ? 0 : (a.targets?.length ?? 1) - 1) || action.bin !== target && type !== 'distribute') return wrong();
    if (type === 'sort' && a.items[action.index] !== a.target) return wrong();
    if (type === 'distribute' && next.bins[action.bin] >= a.targets[action.bin]) return wrong();
    next.picks.push(action.index); next.bins[action.bin] = (next.bins[action.bin] ?? 0) + 1;
    const done = type === 'sort' ? next.bins[0] === a.items.filter((x) => x === a.target).length : type === 'sort-two' ? next.picks.length === a.items.length : next.bins.every((n, i) => n === a.targets[i]);
    return done ? success() : { state: next, result: 'progress' };
  }
  if (type === 'sequence' || type === 'path' || type === 'shopping' || type === 'compose') {
    if (action.type !== 'put' || !bounded(action.index, (a.items ?? a.pieces).length - 1) || next.picks.includes(action.index)) return wrong();
    next.picks.push(action.index);
    const selected = next.picks.map((i) => (a.items ?? a.pieces)[i]);
    if (type === 'compose') {
      if (selected.length < 2) return { state: next, result: 'progress' };
      return a.solutions.some((solution) => solution.join('|') === selected.join('|')) ? success() : wrong();
    }
    if (selected.at(-1) !== a.order[selected.length - 1]) { next.picks.pop(); return wrong(); }
    return selected.length === a.order.length ? success() : { state: next, result: 'progress' };
  }
  if (type === 'observe') {
    if (action.type === 'predict' && a.choices.includes(action.value)) { next.prediction = action.value; next.phase = 1; return { state: next, result: 'progress' }; }
    if (action.type === 'observe' && next.prediction) { next.observed = true; next.phase = 2; return { state: next, result: 'progress' }; }
    return action.type === 'finish' && next.observed ? success() : wrong();
  }
  if (type === 'arrange') {
    if (action.type !== 'put' || !bounded(action.index, a.slots - 1) || a.blocked.includes(action.index) || next.placed.includes(action.index)) return wrong();
    next.placed.push(action.index); return next.placed.length === a.pieces ? success() : { state: next, result: 'progress' };
  }
  return wrong();
}
