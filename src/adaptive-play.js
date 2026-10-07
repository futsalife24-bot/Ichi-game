// あそんだ ないようから、つぎの あそびを ひとつずつ かえる。
// ほし・じかん・ききなおしで むずかしくしたり、さげたりしない。
const DOMAINS = {
  color: { max: 3, choices: [4, 5, 6, 7] },
  shape: { max: 1, choices: [4, 5] },
  count: { max: 3 },
  language: { max: 2, choices: [4, 4, 4] },
};
const DOMAIN_OF = { color: 'color', shape: 'shape', count: 'count', moji: 'language' };
const WINDOW = 8;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const exactKeys = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const validLevel = (level, domain) => count(level) && level <= DOMAINS[domain].max;
const hintMode = value => ['auto', 'manual'].includes(value);
const target = value => typeof value === 'string' && value.length > 0 && value.length <= 24;

export const newAdaptivePlay = () => ({ version: 1, domains: Object.fromEntries(Object.keys(DOMAINS).map(domain => [domain, { level: 0, lastId: 0, recent: [] }])) });

function validEvidence(entry, domain) {
  if (!exactKeys(entry, ['id', 'taskVersion', 'level', 'hintMode', 'hints', 'selections', 'repeats', 'target', 'choices', 'need'])
    || !count(entry.id) || entry.id < 1 || entry.taskVersion !== 1 || !validLevel(entry.level, domain)
    || !hintMode(entry.hintMode) || !['hints', 'selections', 'repeats'].every(key => count(entry[key]))
    || !count(entry.choices) || entry.choices < 2 || entry.choices > 8) return false;
  if (domain === 'count') return entry.target === null && count(entry.need)
    && entry.need >= 2 + entry.level && entry.need <= 3 + entry.level && entry.choices >= entry.need;
  return target(entry.target) && entry.need === null;
}

export function validAdaptivePlay(state) {
  if (!exactKeys(state, ['version', 'domains']) || state.version !== 1 || !exactKeys(state.domains, Object.keys(DOMAINS))) return false;
  const ids = new Set();
  return Object.keys(DOMAINS).every(domain => {
    const value = state.domains[domain];
    if (!exactKeys(value, ['level', 'lastId', 'recent']) || !validLevel(value.level, domain) || !count(value.lastId)
      || !Array.isArray(value.recent) || value.recent.length > WINDOW) return false;
    let previous = 0;
    if (!value.recent.every(entry => {
      if (!validEvidence(entry, domain) || entry.level !== value.level || entry.id <= previous || entry.id > value.lastId || ids.has(entry.id)
        || entry.hintMode !== value.recent[0].hintMode) return false;
      ids.add(entry.id); previous = entry.id; return true;
    })) return false;
    return value.recent.length === 0 || previous === value.lastId;
  });
}

function readState(old) {
  if (old === undefined) return newAdaptivePlay();
  if (!validAdaptivePlay(old)) throw Error('あそびの 自動調整の記録を確認してください');
  return old;
}

export function adaptiveLevel(state, kind) {
  const current = readState(state), domain = DOMAIN_OF[kind];
  return Object.hasOwn(DOMAIN_OF, kind) ? current.domains[domain].level : 0;
}

export function addAdaptiveEvidence(old, event, challenge, settings) {
  const current = readState(old);
  if (!object(event) || !Object.hasOwn(DOMAIN_OF, event.kind) || event.outcome !== 'completed'
    || !object(challenge) || !object(settings) || settings.automatic !== true) return old;
  const domain = DOMAIN_OF[event.kind], value = current.domains[domain];
  if (!validLevel(event.level, domain) || settings.level !== event.level || event.level !== value.level) return old;
  const entry = {
    id: event.id, taskVersion: event.taskVersion, level: event.level, hintMode: settings.hints,
    hints: event.hints, selections: event.selections, repeats: event.repeats,
    target: domain === 'count' ? null : challenge.target,
    choices: challenge.choices, need: domain === 'count' ? challenge.need : null,
  };
  if (!validEvidence(entry, domain) || entry.id <= value.lastId
    || Object.values(current.domains).some(part => part.recent.some(previous => previous.id === entry.id))) return old;
  // ヒントの せっていが ちがう きろくは、ひとつの まとまりにしない。
  const previous = value.recent.at(-1)?.hintMode === entry.hintMode ? value.recent : [];
  let recent = [...previous, entry].slice(-WINDOW), level = value.level;
  const lastFour = recent.slice(-4);
  const stepDown = domain !== 'count' && level > 0 && lastFour.length === 4 && lastFour.filter(item => item.selections >= 3).length >= 3;
  const stepUp = level < DOMAINS[domain].max && recent.length === WINDOW && (
    domain === 'count'
      ? recent.every(item => item.hints === 0 && item.selections === item.need) && new Set(recent.map(item => item.need)).size >= 2
      : recent.every(item => item.hints === 0 && item.selections === 1 && item.choices === DOMAINS[domain].choices[level]) && new Set(recent.map(item => item.target)).size >= 3
  );
  if (stepDown || stepUp) { level += stepDown ? -1 : 1; recent = []; }
  return { ...current, domains: { ...current.domains, [domain]: { level, lastId: entry.id, recent } } };
}

const setting = (settings, domain) => settings?.domains[domain] ?? { level: null, hints: 'auto' };
function validSettings(settings) {
  return settings === undefined || object(settings) && settings.version === 1 && object(settings.domains)
    && Object.keys(DOMAINS).every(domain => {
      const value = settings.domains[domain];
      return object(value) && (value.level === null || validLevel(value.level, domain)) && hintMode(value.hints);
    });
}

// せっていを かえた ぶんやは、これからの あそびを あらためて みる。
export function afterAdaptiveSettings(old, before, next, lastId) {
  const current = readState(old);
  if (!validSettings(before) || !validSettings(next) || !count(lastId)) throw Error('自動調整の設定変更を確認してください');
  let domains = current.domains, changed = false;
  for (const domain of Object.keys(DOMAINS)) {
    const a = setting(before, domain), b = setting(next, domain);
    if (a.level === b.level && a.hints === b.hints) continue;
    if (!changed) domains = { ...domains };
    domains[domain] = { ...domains[domain], lastId: Math.max(domains[domain].lastId, lastId), recent: [] };
    changed = true;
  }
  return changed ? { ...current, domains } : old;
}
