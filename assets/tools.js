// Date tools for the relationship counter, anniversary calculator and Valentine's countdown.
// Everything runs in the browser. Dates are compared as calendar days, so time zones and
// daylight saving cannot shift a result.
(function (root) {
  var DAY = 86400000;

  function parse(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var check = new Date(Date.UTC(y, mo - 1, d));
    if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
    return { y: y, m: mo, d: d };
  }
  function serial(p) { return Date.UTC(p.y, p.m - 1, p.d) / DAY; }
  function fromSerial(n) {
    var t = new Date(n * DAY);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  // Adds whole months; the 31st becomes the last day of a shorter month, February 29 becomes the 28th.
  function addMonths(p, months) {
    var total = p.y * 12 + (p.m - 1) + months;
    var y = Math.floor(total / 12), m = total % 12 + 1;
    return { y: y, m: m, d: Math.min(p.d, daysInMonth(y, m)) };
  }
  function addDays(p, days) { return fromSerial(serial(p) + days); }
  function daysBetween(a, b) { return serial(b) - serial(a); }

  function breakdown(start, today) {
    var months = (today.y - start.y) * 12 + (today.m - start.m);
    if (serial(addMonths(start, months)) > serial(today)) months--;
    return {
      years: Math.floor(months / 12),
      months: months % 12,
      days: daysBetween(addMonths(start, months), today)
    };
  }
  function nextAnniversary(start, today) {
    var years = Math.max(1, today.y - start.y);
    var next = addMonths(start, years * 12);
    if (serial(next) < serial(today)) { years++; next = addMonths(start, years * 12); }
    return { number: years, date: next, inDays: daysBetween(today, next) };
  }
  var ROUND_DAYS = [100, 200, 300, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000];
  function nextRoundDay(start, today) {
    var total = daysBetween(start, today);
    for (var i = 0; i < ROUND_DAYS.length; i++) {
      if (ROUND_DAYS[i] > total) return { days: ROUND_DAYS[i], date: addDays(start, ROUND_DAYS[i]), inDays: ROUND_DAYS[i] - total };
    }
    return null;
  }
  function milestones(start) {
    var list = [
      { label: "1 month", date: addMonths(start, 1) },
      { label: "3 months", date: addMonths(start, 3) },
      { label: "100 days", date: addDays(start, 100) },
      { label: "6 months", date: addMonths(start, 6) },
      { label: "1 year", date: addMonths(start, 12) },
      { label: "500 days", date: addDays(start, 500) },
      { label: "2 years", date: addMonths(start, 24) },
      { label: "1,000 days", date: addDays(start, 1000) },
      { label: "3 years", date: addMonths(start, 36) },
      { label: "5 years", date: addMonths(start, 60) },
      { label: "2,000 days", date: addDays(start, 2000) },
      { label: "10 years", date: addMonths(start, 120) },
      { label: "5,000 days", date: addDays(start, 5000) },
      { label: "15 years", date: addMonths(start, 180) },
      { label: "20 years", date: addMonths(start, 240) },
      { label: "25 years", date: addMonths(start, 300) },
      { label: "10,000 days", date: addDays(start, 10000) },
      { label: "50 years", date: addMonths(start, 600) }
    ];
    return list.sort(function (a, b) { return serial(a.date) - serial(b.date); });
  }
  function nextDate(month, day, today) {
    var y = today.y;
    if (serial({ y: y, m: month, d: day }) < serial(today)) y++;
    return { y: y, m: month, d: day };
  }

  var api = { parse: parse, serial: serial, addMonths: addMonths, addDays: addDays, daysBetween: daysBetween, breakdown: breakdown, nextAnniversary: nextAnniversary, nextRoundDay: nextRoundDay, milestones: milestones, nextDate: nextDate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root.document) return;

  var doc = root.document;
  var now = new Date();
  var today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function format(p) { return MONTHS[p.m - 1] + " " + p.d + ", " + p.y; }
  function weekday(p) { return WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()]; }
  function number(n) { return n.toLocaleString("en-US"); }
  function plural(n, word) { return number(n) + " " + word + (n === 1 ? "" : "s"); }
  function text(el, value) { if (el) el.textContent = value; }
  function iso(p) { return p.y + "-" + String(p.m).padStart(2, "0") + "-" + String(p.d).padStart(2, "0"); }
  function remembered() { try { return root.localStorage.getItem("lk-start-date"); } catch (e) { return null; } }
  function remember(value) { try { root.localStorage.setItem("lk-start-date", value); } catch (e) {} }

  function counter(box) {
    var input = box.querySelector("input");
    var result = box.querySelector(".result");
    function show() {
      var start = parse(input.value);
      if (!start || serial(start) > serial(today)) { result.hidden = true; return; }
      remember(input.value);
      var total = daysBetween(start, today);
      var parts = breakdown(start, today);
      var next = nextAnniversary(start, today);
      var round = nextRoundDay(start, today);
      text(box.querySelector("[data-total]"), plural(total, "day"));
      text(box.querySelector("[data-parts]"), plural(parts.years, "year") + ", " + plural(parts.months, "month") + " and " + plural(parts.days, "day") + ", or " + plural(Math.floor(total / 7), "week") + ".");
      text(box.querySelector("[data-next]"), next.inDays === 0 ? "Your anniversary number " + next.number + " is today." : "Anniversary number " + next.number + " is on " + weekday(next.date) + ", " + format(next.date) + ", in " + plural(next.inDays, "day") + ".");
      text(box.querySelector("[data-round]"), round ? "Day " + number(round.days) + " is on " + format(round.date) + ", in " + plural(round.inDays, "day") + "." : "");
      var code = box.querySelector("[data-embed]");
      if (code) code.value = '<iframe src="https://lovekeeper.app/embed/relationship-counter/?start=' + iso(start) + '" width="320" height="130" style="border:0" title="Relationship counter"></iframe>';
      result.hidden = false;
    }
    input.max = iso(today);
    input.addEventListener("input", show);
    var saved = remembered();
    if (saved) input.value = saved;
    show();
  }

  function calculator(box) {
    var input = box.querySelector("input");
    var result = box.querySelector(".result");
    var body = box.querySelector("tbody");
    function show() {
      var start = parse(input.value);
      if (!start) { result.hidden = true; return; }
      remember(input.value);
      body.textContent = "";
      milestones(start).forEach(function (item) {
        var left = daysBetween(today, item.date);
        if (left < 0) return;
        var row = doc.createElement("tr");
        [["Milestone", item.label], ["Date", weekday(item.date).slice(0, 3) + ", " + format(item.date)], ["When", left === 0 ? "Today" : "In " + plural(left, "day")]].forEach(function (cell) {
          var td = doc.createElement("td");
          td.setAttribute("data-label", cell[0]);
          td.textContent = cell[1];
          row.appendChild(td);
        });
        body.appendChild(row);
      });
      result.hidden = false;
    }
    input.addEventListener("input", show);
    var saved = remembered();
    if (saved) input.value = saved;
    show();
  }

  function countdown(box) {
    var date = nextDate(+box.getAttribute("data-month"), +box.getAttribute("data-day"), today);
    var left = daysBetween(today, date);
    text(box.querySelector("[data-total]"), left === 0 ? "It's today!" : plural(left, "day"));
    text(box.querySelector("[data-date]"), weekday(date) + ", " + format(date));
  }

  function embed(box) {
    var value = new URLSearchParams(root.location.search).get("start");
    var start = parse(value);
    if (!start || serial(start) > serial(today)) { text(box.querySelector("[data-total]"), "Add a start date"); return; }
    text(box.querySelector("[data-total]"), plural(daysBetween(start, today), "day"));
  }

  doc.querySelectorAll("[data-tool=counter]").forEach(counter);
  doc.querySelectorAll("[data-tool=calculator]").forEach(calculator);
  doc.querySelectorAll("[data-tool=countdown]").forEach(countdown);
  doc.querySelectorAll("[data-tool=embed]").forEach(embed);
})(this);
