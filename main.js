const STARTS = ["07:30", "08:00", "12:10", "17:30", "18:00"];
const VISITS = {
  "First visit": { minutes: 45, price: "£78" },
  "Follow-up": { minutes: 25, price: "£52" },
};
const REASONS = {
  desk: "Desk pain",
  training: "Training",
  straight: "A straight recommendation",
};
const BOOK_KEY = "reid-bookings";
const DRAFT_KEY = "reid-draft";

const form = document.querySelector("#book");
const days = [];
const cursor = new Date();
cursor.setDate(cursor.getDate() + 1);
while (days.length < 8) {
  if (cursor.getDay() !== 0 && cursor.getDay() !== 6) days.push(new Date(cursor));
  cursor.setDate(cursor.getDate() + 1);
}

const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const toMinutes = (time) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const overlaps = (start, length, otherStart, otherLength) =>
  start < otherStart + otherLength && otherStart < start + length;

const readJson = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* This browser is keeping the booking in memory only. */
  }
};

const bookings = () => {
  const value = readJson(BOOK_KEY, []);
  return Array.isArray(value) ? value : [];
};

const isFree = (day, time, length) => {
  const start = toMinutes(time);
  return bookings()
    .filter((item) => item.day === day)
    .every((item) => !overlaps(start, length, toMinutes(item.time), Number(item.minutes)));
};

const openSlots = (length) => {
  const slots = [];
  for (const date of days) {
    for (const time of STARTS) {
      if (isFree(dayKey(date), time, length)) slots.push({ date, day: dayKey(date), time });
    }
  }
  return slots;
};

const dateFor = (day) => days.find((date) => dayKey(date) === day);
const shortWhen = (date, time) =>
  `${date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${time}`;
const longWhen = (date, time) =>
  `${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}, ${time}`;

let visit = "First visit";
let reason = "desk";
let selectedDay = dayKey(days[0]);
let selectedTime = "";

const draft = readJson(DRAFT_KEY, null);
if (draft && typeof draft === "object") {
  if (VISITS[draft.visit]) visit = draft.visit;
  if (REASONS[draft.reason]) reason = draft.reason;
  if (days.some((date) => dayKey(date) === draft.day)) selectedDay = draft.day;
  if (STARTS.includes(draft.time)) selectedTime = draft.time;
  form.elements.name.value = draft.name || "";
  form.elements.email.value = draft.email || "";
  form.elements.phone.value = draft.phone || "";
}

const saveDraft = () => {
  writeJson(DRAFT_KEY, {
    visit,
    reason,
    day: selectedDay,
    time: selectedTime,
    name: form.elements.name.value,
    email: form.elements.email.value,
    phone: form.elements.phone.value,
  });
};

const setText = (selector, text) => {
  document.querySelector(selector).textContent = text;
};

function paint() {
  const length = VISITS[visit].minutes;
  const slots = openSlots(length);
  const selectedStillOpen = slots.some((slot) => slot.day === selectedDay && slot.time === selectedTime);
  if (!selectedStillOpen && slots[0]) {
    selectedDay = slots[0].day;
    selectedTime = slots[0].time;
  }
  if (!slots.length) selectedTime = "";

  form.querySelectorAll('input[name="visit"]').forEach((input) => {
    input.checked = input.value === visit;
  });
  document.querySelectorAll("[data-reason]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.reason === reason));
  });

  const chosen = dateFor(selectedDay);
  document.querySelector("#quick").replaceChildren(
    ...slots.slice(0, 3).map((slot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot";
      button.textContent = shortWhen(slot.date, slot.time);
      button.setAttribute("aria-pressed", String(slot.day === selectedDay && slot.time === selectedTime));
      button.addEventListener("click", () => {
        selectedDay = slot.day;
        selectedTime = slot.time;
        paint();
      });
      return button;
    })
  );

  document.querySelector("#days").replaceChildren(
    ...days.map((date) => {
      const key = dayKey(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot";
      button.innerHTML = `<strong>${date.toLocaleDateString("en-GB", { weekday: "short" })}</strong><small>${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small>`;
      button.setAttribute("aria-pressed", String(key === selectedDay));
      button.addEventListener("click", () => {
        selectedDay = key;
        if (!isFree(key, selectedTime, length)) {
          selectedTime = STARTS.find((time) => isFree(key, time, length)) || "";
        }
        paint();
      });
      return button;
    })
  );

  document.querySelector("#times").replaceChildren(
    ...STARTS.map((time) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot";
      button.textContent = time;
      const free = isFree(selectedDay, time, length);
      button.disabled = !free;
      button.setAttribute("aria-pressed", String(free && time === selectedTime));
      if (free) {
        button.addEventListener("click", () => {
          selectedTime = time;
          paint();
        });
      }
      return button;
    })
  );

  const next = openSlots(VISITS["First visit"].minutes)[0];
  setText(
    "#next-open",
    next
      ? `Next open first visit: ${longWhen(next.date, next.time)} · £78`
      : "No first visit is open in the next eight working days."
  );
  const nextShort = next ? shortWhen(next.date, next.time) : "No open time";
  setText("#nav-book", nextShort);
  setText("#footer-book", nextShort);
  setText("#mobile-book", nextShort);
  const buttonLabel = chosen && selectedTime ? `Book ${shortWhen(chosen, selectedTime)}` : "No open time";
  const submit = document.querySelector("#submit-booking");
  submit.textContent = buttonLabel;
  submit.disabled = !selectedTime;
  setText(
    "#summary",
    chosen && selectedTime
      ? `${visit} · ${length} minutes · ${VISITS[visit].price} · ${longWhen(chosen, selectedTime)} · ${REASONS[reason]}`
      : "No open time for this visit."
  );
  saveDraft();
}

const bookingFields = () =>
  form.querySelectorAll("fieldset, .summary, .reassure, .fields, #submit-booking");

form.addEventListener("change", (event) => {
  if (event.target.name === "visit") {
    visit = event.target.value;
    paint();
  }
});
form.addEventListener("input", saveDraft);
document.querySelector("#reasons").addEventListener("click", (event) => {
  const button = event.target.closest("[data-reason]");
  if (!button) return;
  reason = button.dataset.reason;
  paint();
});
document.querySelectorAll(".card[data-reason]").forEach((card) => {
  card.addEventListener("click", () => {
    reason = card.dataset.reason;
    paint();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const phone = form.elements.phone.value.trim();
  const error = document.querySelector("#form-error");
  const length = VISITS[visit].minutes;
  if (!name || (!email && !phone) || !selectedTime || !isFree(selectedDay, selectedTime, length)) {
    error.hidden = false;
    return;
  }
  error.hidden = true;
  writeJson(BOOK_KEY, [...bookings(), { day: selectedDay, time: selectedTime, minutes: length }]);
  const when = dateFor(selectedDay);
  setText("#confirm-title", longWhen(when, selectedTime));
  setText(
    "#confirm-detail",
    `${visit}, ${length} minutes, ${VISITS[visit].price}. Booked for ${name}. ${REASONS[reason]}.`
  );
  bookingFields().forEach((node) => {
    node.hidden = true;
  });
  document.querySelector("#confirm").hidden = false;
  selectedTime = "";
  saveDraft();
  const next = openSlots(VISITS["First visit"].minutes)[0];
  setText(
    "#next-open",
    next
      ? `Next open first visit: ${longWhen(next.date, next.time)} · £78`
      : "No first visit is open in the next eight working days."
  );
  const nextShort = next ? shortWhen(next.date, next.time) : "No open time";
  setText("#nav-book", nextShort);
  setText("#footer-book", nextShort);
  setText("#mobile-book", nextShort);
});

document.querySelector("#book-another").addEventListener("click", () => {
  document.querySelector("#confirm").hidden = true;
  bookingFields().forEach((node) => {
    node.hidden = false;
  });
  paint();
});

paint();
