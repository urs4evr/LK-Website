// The recovered BondAmour calculator, adapted for LoveKeeper. Calendar arithmetic is shared
// with the existing counter; private shared dates use a fragment rather than a query string.
(function (root) {
  'use strict';
  var dates = typeof module !== 'undefined' && module.exports ? require('./tools.js') : root.LoveKeeperDates;
  function validate(value) {
    if (!value || !['relationship', 'married'].includes(value.kind)) return 'Choose a relationship or marriage.';
    var start = dates.parse(value.date), dating = dates.parse(value.dating);
    if (!start || start.y < 100 || start.y > 9998) return 'Please enter a valid date between years 100 and 9998.';
    if (value.kind === 'married' && value.dating) {
      if (!dating || dating.y < 100 || dating.y > 9998) return 'Please enter a valid dating date.';
      if (dates.serial(dating) > dates.serial(start)) return 'Your dating date must be on or before your wedding date.';
    }
    return '';
  }
  function story(value, today) {
    var error = validate(value);
    if (error) throw new Error(error);
    var journeys = [{ name: value.kind === 'married' ? 'Marriage' : 'Relationship', start: dates.parse(value.date) }];
    if (value.kind === 'married' && value.dating) journeys.unshift({ name: 'Relationship', start: dates.parse(value.dating) });
    return journeys.map(function (journey) {
      var total = dates.daysBetween(journey.start, today);
      var next = total < 0 ? { number: 0, date: journey.start, inDays: -total } : dates.nextAnniversary(journey.start, today);
      var list = dates.milestones(journey.start);
      var label = next.number === 0 ? 'The beginning' : next.number + (next.number === 1 ? ' year' : ' years');
      if (!list.some(function (item) { return item.label === label; })) list.push({ label: label, date: next.date });
      return { name: journey.name, start: journey.start, total: total, parts: total < 0 ? null : dates.breakdown(journey.start, today), next: next,
        upcoming: list.filter(function (item) { return dates.serial(item.date) >= dates.serial(today); }).sort(function (a, b) { return dates.serial(a.date) - dates.serial(b.date); }) };
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { validate: validate, story: story };
  if (!root.document) return;
  var doc = root.document, box = doc.querySelector('[data-tool="journey"]');
  if (!box) return;
  var form = box.querySelector('form'), primary = form.elements.date, datingInput = form.elements.dating;
  var result = box.querySelector('[data-journey-result]'), errorNode = box.querySelector('#journey-error');
  var shareStatus = box.querySelector('[data-share-status]'), saveStatus = box.querySelector('[data-save-status]'), active = null, fromShare = false;
  var storageKey = 'lk-anniversary-story';
  function today() { var n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }; }
  function format(p) { return new Date(dates.serial(p) * 86400000).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }); }
  function plural(n, unit) { return n.toLocaleString('en-US') + ' ' + unit + (n === 1 ? '' : 's'); }
  function node(tag, value, className) { var el = doc.createElement(tag); if (value !== undefined) el.textContent = value; if (className) el.className = className; return el; }
  function read() { return { kind: form.elements['journey-kind'].value, date: primary.value, dating: form.elements['journey-kind'].value === 'married' ? datingInput.value : '' }; }
  function mode() {
    var married = form.elements['journey-kind'].value === 'married';
    box.querySelector('[data-dating-field]').hidden = !married;
    datingInput.disabled = !married;
    box.querySelector('[data-date-label]').textContent = married ? 'When did you get married (or plan to)?' : 'When did your relationship start?';
  }
  function load(value) { form.elements['journey-kind'].value = value.kind; primary.value = value.date; datingInput.value = value.dating || ''; mode(); }
  function render(value) {
    var now = today(), journeys = story(value, now);
    var summaries = box.querySelector('[data-summaries]'), timeline = box.querySelector('[data-timeline]'), body = box.querySelector('[data-milestones]');
    summaries.replaceChildren(); timeline.replaceChildren(); body.replaceChildren();
    var events = [], upcoming = [];
    journeys.forEach(function (j) {
      var card = node('section', undefined, 'journey-summary');
      card.appendChild(node('h3', j.name + ' journey'));
      card.appendChild(node('p', j.total < 0 ? plural(-j.total, 'day') + ' to go' : plural(j.total, 'day'), 'journey-total'));
      card.appendChild(node('p', j.parts ? plural(j.parts.years, 'year') + ', ' + plural(j.parts.months, 'month') + ' and ' + plural(j.parts.days, 'day') : 'Your next chapter starts on ' + format(j.start)));
      if (j.total >= 0) card.appendChild(node('p', plural(Math.floor(j.total / 7), 'whole week') + ' since ' + format(j.start), 'note'));
      var nextText = j.next.number === 0 ? 'Your story begins' : 'Anniversary ' + j.next.number;
      card.appendChild(node('p', j.next.inDays === 0 ? '♡ ' + nextText + ' is today!' : nextText + ' in ' + plural(j.next.inDays, 'day'), 'journey-countdown'));
      if (j.next.inDays > 0 && j.next.number > 0) card.appendChild(node('p', format(j.next.date), 'note'));
      summaries.appendChild(card);
      events.push({ label: j.name === 'Marriage' ? 'Wedding day' : 'Your story begins', date: j.start });
      if (j.next.number > 0) events.push({ label: j.name + ' anniversary ' + j.next.number, date: j.next.date });
      j.upcoming.forEach(function (item) { upcoming.push({ label: j.name + ' · ' + item.label, date: item.date }); });
    });
    events.push({ label: 'Today', date: now });
    events.sort(function (a, b) { return dates.serial(a.date) - dates.serial(b.date); }).forEach(function (event) {
      var li = node('li'); li.appendChild(node('strong', event.label)); li.appendChild(node('span', format(event.date))); timeline.appendChild(li);
    });
    upcoming.sort(function (a, b) { return dates.serial(a.date) - dates.serial(b.date); }).forEach(function (item) {
      var row = node('tr'), left = dates.daysBetween(now, item.date);
      [item.label, format(item.date), left === 0 ? 'Today ♡' : 'In ' + plural(left, 'day')].forEach(function (value, i) { var cell = node('td', value); cell.dataset.label = ['Milestone', 'Date', 'When'][i]; row.appendChild(cell); });
      body.appendChild(row);
    });
    box.querySelector('[data-journey-status]').textContent = fromShare ? 'Viewing a shared love story. Your saved dates have not changed.' : 'Your love story, as of ' + format(now) + '.';
    result.hidden = false;
  }
  function clearSharedAddress() { if (root.location.hash) root.history.replaceState(null, '', root.location.pathname + root.location.search); }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var value = read(), error = validate(value); errorNode.textContent = error;
    if (error) { result.hidden = true; return; }
    fromShare = false; clearSharedAddress(); active = value; render(value); shareStatus.textContent = '';
    try { root.localStorage.setItem(storageKey, JSON.stringify(value)); saveStatus.textContent = 'Dates saved in this browser.'; } catch (_) { saveStatus.textContent = 'Your story is ready, but this browser could not save your dates. You can keep a shared link instead.'; }
  });
  form.addEventListener('input', function () { mode(); result.hidden = true; active = null; errorNode.textContent = ''; shareStatus.textContent = ''; });
  box.querySelector('[data-clear]').addEventListener('click', function () {
    try { root.localStorage.removeItem(storageKey); root.localStorage.removeItem('lk-start-date'); saveStatus.textContent = 'Saved dates cleared from this browser.'; } catch (_) { saveStatus.textContent = 'The form is cleared, but browser storage could not be accessed. Remove site data in your browser settings to clear any saved dates.'; }
    clearSharedAddress(); form.reset(); mode(); result.hidden = true; active = null; fromShare = false;
    errorNode.textContent = ''; primary.focus(); shareStatus.textContent = '';
  });
  box.querySelector('[data-journey-share]').addEventListener('click', async function () {
    if (!active) return;
    var params = new URLSearchParams({ kind: active.kind, date: active.date });
    if (active.dating) params.set('dating', active.dating);
    var url = root.location.origin + root.location.pathname + '#' + params.toString();
    try {
      if (root.navigator.share) await root.navigator.share({ title: 'Our love story · LoveKeeper', url: url });
      else if (root.navigator.clipboard) { await root.navigator.clipboard.writeText(url); shareStatus.textContent = 'Link copied. Your dates are included.'; }
      else root.prompt('Copy your story link (includes your dates)', url);
    } catch (error) {
      if (error.name !== 'AbortError') { shareStatus.textContent = 'Sharing was unavailable. You can copy this link instead.'; root.prompt('Copy your story link (includes your dates)', url); }
    }
  });
  // Shared links are explicit and never persisted on arrival. Do not expose dates to analytics.
  var params = new URLSearchParams(root.location.hash.slice(1));
  var shared = { kind: params.get('kind'), date: params.get('date'), dating: params.get('dating') || '' };
  if (params.has('date')) {
    if (!validate(shared)) { fromShare = true; active = shared; load(shared); render(shared); }
    else { mode(); errorNode.textContent = 'This shared story contains invalid dates. Please enter your dates below.'; }
  } else {
    var saved = null;
    try { saved = JSON.parse(root.localStorage.getItem(storageKey)); } catch (_) {}
    if (saved && !validate(saved)) { active = saved; load(saved); render(saved); } else mode();
  }
  // Keep open results correct across midnight and when returning to a background tab.
  var renderedDay = dates.serial(today());
  function refresh() { var day = dates.serial(today()); if (day !== renderedDay) { renderedDay = day; if (active) render(active); } }
  root.setInterval(refresh, 30000);
  doc.addEventListener('visibilitychange', refresh);
})(this);
