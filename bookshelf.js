"use strict";

/*
  Shared Caltech Book Club rendering logic
  for both index.html (bookshelf) and book.html (detail page).
*/
const books = Array.isArray(window.BOOKS) ? window.BOOKS : [];
const events = Array.isArray(window.events) ? window.events : [];
const booksById = new Map(
  books
    .filter((book) => book && typeof book.id === "string")
    .map((book) => [book.id, book])
);
const eventsById = new Map(
  events
    .filter((event) => event && typeof event.id === "string")
    .map((event) => [event.id, event])
);
const bookIdsByLength = Array.from(booksById.keys()).sort((a, b) => b.length - a.length);
const dayMs = 1000 * 60 * 60 * 24;

const statusMeta = {
  past: { label: "Past", className: "is-past" },
  current: { label: "Current", className: "is-current" },
  future: { label: "Future", className: "is-future" }
};

function parseBookDate(value, timeValue) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  const raw = String(value);
  const normalized = raw.includes("T")
    ? raw
    : raw + "T" + (timeValue ? String(timeValue) : "00:00") + (timeValue ? ":00" : ":00:00");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getNormalizedEvent(event) {
  if (!event || typeof event !== "object") return null;
  const dateTime = parseBookDate(event.date, event.time || "00:00");
  if (!dateTime) return null;

  return {
    ...event,
    dateTime,
    note: event.note ? String(event.note) : "",
    location: event.location ? String(event.location) : "",
    tags: Array.isArray(event.tags) ? event.tags : []
  };
}

function getStartOfDayTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function inferBookIdFromEventId(eventId) {
  if (!eventId) return null;
  const eventKey = String(eventId);
  return bookIdsByLength.find((bookId) => eventKey === bookId || eventKey.startsWith(bookId + "-")) || null;
}

function getRelatedBookIdForEvent(event) {
  if (!event || typeof event !== "object") return null;
  if (typeof event.bookId === "string" && event.bookId.trim()) {
    return event.bookId.trim();
  }
  return inferBookIdFromEventId(event.id);
}

function getBookEvents(book) {
  if (!book || typeof book.id !== "string") return [];
  const linkedEventIds = new Set(Array.isArray(book.events) ? book.events.map((eventId) => String(eventId)) : []);

  return events
    .filter((event) => {
      if (!event || typeof event.id !== "string") return false;
      return linkedEventIds.has(event.id) || getRelatedBookIdForEvent(event) === book.id;
    })
    .map((event) => getNormalizedEvent(event))
    .filter(Boolean)
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
}

function getBookMeetingDates(book) {
  return getBookEvents(book).map((event) => event.dateTime);
}

function getEventById(id) {
  return getNormalizedEvent(eventsById.get(String(id)));
}

function getBookForEvent(eventId) {
  const explicitBook = books.find((book) => Array.isArray(book.events) && book.events.includes(eventId)) || null;
  if (explicitBook) return explicitBook;

  const event = getEventById(eventId);
  const relatedBookId = getRelatedBookIdForEvent(event);
  return relatedBookId ? booksById.get(relatedBookId) || null : null;
}

function hasTag(book, tag) {
  if (!Array.isArray(book.tags)) return false;
  return book.tags.some((bookTag) => String(bookTag).toLowerCase() === tag);
}

function getBookStatus(book, referenceDate) {
  const now = referenceDate || new Date();
  const meetings = getBookMeetingDates(book);
  if (!meetings.length) return "future";

  const nowTime = getStartOfDayTime(now);
  const meetingDayTimes = meetings.map((meeting) => getStartOfDayTime(meeting));
  const pastMeetings = meetingDayTimes.filter((time) => time < nowTime);
  const futureMeetings = meetingDayTimes.filter((time) => time >= nowTime);

  if (hasTag(book, "monthly")) {
    const isWithinMeetingMonth = meetingDayTimes.some((meetingTime) => meetingTime >= nowTime && meetingTime - nowTime <= 31 * dayMs);
    if (isWithinMeetingMonth) return "current";
  }

  if (pastMeetings.length && futureMeetings.length) return "current";
  if (pastMeetings.length && !futureMeetings.length) {
    if (hasTag(book, "weekly")) {
      const latestMeeting = pastMeetings[pastMeetings.length - 1];
      const recencyDays = Math.ceil((nowTime - latestMeeting) / dayMs);
      if (recencyDays <= 14) return "current";
    }
    return "past";
  }

  if (futureMeetings.length) {
    const nearestFuture = futureMeetings.reduce((min, time) => (time < min ? time : min), futureMeetings[0]);
    const diffDays = Math.ceil((nearestFuture - nowTime) / dayMs);
    if (hasTag(book, "term") && diffDays <= 120) return "current";
    return "future";
  }

  return "future";
}

function getSortedBooks() {
  return books.slice().sort((a, b) => {
    const aDates = getBookMeetingDates(a);
    const bDates = getBookMeetingDates(b);
    const aStart = aDates.length ? aDates[0] : null;
    const bStart = bDates.length ? bDates[0] : null;
    const aTime = aStart ? aStart.getTime() : Number.POSITIVE_INFINITY;
    const bTime = bStart ? bStart.getTime() : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    return a.title.localeCompare(b.title);
  });
}

function getSortedEvents() {
  return events
    .map((event) => getNormalizedEvent(event))
    .filter(Boolean)
    .sort((a, b) => {
      const timeDiff = a.dateTime.getTime() - b.dateTime.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.title.localeCompare(b.title);
    });
}

function formatDateTime(date) {
  const datePart = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timePart = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return datePart + " at " + timePart;
}

function getShelfMeetingLabel(book, now) {
  const bookEvents = getBookEvents(book);
  if (!bookEvents.length) return "No meetings scheduled";

  const nowDate = now || new Date();
  const upcoming = bookEvents.find((event) => event.dateTime.getTime() >= nowDate.getTime()) || null;
  if (upcoming) {
    return "Next meeting: " + formatDateTime(upcoming.dateTime);
  }

  const latest = bookEvents[bookEvents.length - 1];
  return "Last meeting: " + formatDateTime(latest.dateTime);
}

function makeBookNode(book) {
  const link = document.createElement("a");
  link.className = "book-link";
  link.href = "book.html?id=" + encodeURIComponent(book.id);
  link.setAttribute("aria-label", "View details for " + book.title + " by " + book.author);

  const visual = document.createElement("article");
  visual.className = "book";

  const img = document.createElement("img");
  img.className = "book-cover";
  img.src = book.cover;
  img.alt = book.title + " cover";
  img.loading = "lazy";
  img.decoding = "async";
  img.onerror = function onCoverError() {
    visual.classList.add("no-cover");
    img.alt = "";
  };

  const fallback = document.createElement("div");
  fallback.className = "book-fallback";
  fallback.textContent = book.title;

  const primaryTag = Array.isArray(book.tags) && book.tags.length ? String(book.tags[0]) : "";
  const tagBadge = document.createElement("span");
  tagBadge.className = "book-tag";
  tagBadge.textContent = primaryTag;

  const overlay = document.createElement("div");
  overlay.className = "book-overlay";

  const overlayTitle = document.createElement("p");
  overlayTitle.className = "book-overlay-title";
  overlayTitle.textContent = book.title;

  const overlayAuthor = document.createElement("p");
  overlayAuthor.className = "book-overlay-author";
  overlayAuthor.textContent = book.author;

  const overlayTerm = document.createElement("p");
  overlayTerm.className = "book-overlay-term";
  overlayTerm.textContent = getShelfMeetingLabel(book);

  visual.appendChild(img);
  visual.appendChild(fallback);
  if (primaryTag) {
    visual.appendChild(tagBadge);
  }
  overlay.appendChild(overlayTitle);
  overlay.appendChild(overlayAuthor);
  overlay.appendChild(overlayTerm);
  visual.appendChild(overlay);
  link.appendChild(visual);

  return link;
}

function renderHomePage() {
  const track = document.getElementById("bookshelf-track");
  const viewport = document.getElementById("bookshelf-viewport");
  if (!track || !viewport) return;

  if (!books.length) {
    return;
  }

  const orderedStatuses = ["past", "current", "future"];
  const sortedBooks = getSortedBooks();
  const now = new Date();
  const fragment = document.createDocumentFragment();
  let appendedGroupCount = 0;
  orderedStatuses.forEach((status) => {
    const groupBooks = sortedBooks.filter((book) => getBookStatus(book, now) === status);
    if (!groupBooks.length) return;

    if (appendedGroupCount > 0) {
      const spacer = document.createElement("div");
      spacer.className = "book-group-gap";
      spacer.setAttribute("aria-hidden", "true");
      fragment.appendChild(spacer);
    }

    const group = document.createElement("section");
    group.className = "book-group " + statusMeta[status].className;
    group.setAttribute("aria-label", statusMeta[status].label + " books");
    group.setAttribute("data-status", status);

    const label = document.createElement("h3");
    label.className = "group-label";
    label.textContent = statusMeta[status].label;
    
    const labelWrap = document.createElement("div");
    labelWrap.className = "group-label-wrap";
    labelWrap.appendChild(label);
    group.appendChild(labelWrap);

    const lanes = document.createElement("div");
    lanes.className = "shelf-lanes";

    const row1 = document.createElement("div");
    row1.className = "shelf-row";
    const row2 = document.createElement("div");
    row2.className = "shelf-row";

    groupBooks.forEach((book, index) => {
      // Alternate rows: top, bottom, top, bottom...
      // This keeps them sorted left-to-right chronologically
      // and ensures the top row always has >= books than bottom row.
      const isTopRow = index % 2 === 0;
      const lane = isTopRow ? row1 : row2;
      lane.appendChild(makeBookNode(book));
    });

    lanes.appendChild(row1);
    lanes.appendChild(row2);
    group.appendChild(lanes);
    fragment.appendChild(group);
    appendedGroupCount += 1;
  });

  track.appendChild(fragment);
  setupTrackAlignment(viewport, track);
  setupBookPerspective(viewport);
  setupStickyChips(viewport, track);
  setupInitialShelfCentering(viewport, track);
  renderTimelineFilters();
  renderTimeline();
}

let activeTimelineTag = "Social";

function renderTimelineFilters() {
  const container = document.getElementById("timeline-filters");
  if (!container) return;

  const allEvents = getSortedEvents();
  const tags = new Set();
  allEvents.forEach((e) => {
    if (Array.isArray(e.tags)) {
      e.tags.forEach((t) => tags.add(t));
    }
  });
  const sortedTags = Array.from(tags).sort();

  container.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "timeline-filter" + (activeTimelineTag === null ? " is-active" : "");
  allBtn.textContent = "All";
  allBtn.onclick = () => {
    activeTimelineTag = null;
    renderTimelineFilters();
    renderTimeline();
  };
  container.appendChild(allBtn);

  sortedTags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "timeline-filter" + (activeTimelineTag === tag ? " is-active" : "");
    btn.textContent = tag;
    btn.onclick = () => {
      activeTimelineTag = tag;
      renderTimelineFilters();
      renderTimeline();
    };
    container.appendChild(btn);
  });
}

function renderTimeline() {
  const viewport = document.getElementById("timeline-viewport");
  const track = document.getElementById("timeline-track");
  if (!viewport || !track) return;

  const allTimelineEvents = getSortedEvents();
  const timelineEvents = activeTimelineTag
    ? allTimelineEvents.filter((e) => Array.isArray(e.tags) && e.tags.includes(activeTimelineTag))
    : allTimelineEvents;

  if (!timelineEvents.length) {
    track.innerHTML = "";
    return;
  }

  track.innerHTML = "";

  const axis = document.createElement("div");
  axis.className = "timeline-axis";
  axis.setAttribute("aria-hidden", "true");
  track.appendChild(axis);

  timelineEvents.forEach((event) => {
    const item = document.createElement("div");
    item.className = "timeline-event";
    item.dataset.timestamp = String(event.dateTime.getTime());

    const tick = document.createElement("span");
    tick.className = "timeline-tick";
    tick.setAttribute("aria-hidden", "true");

    const link = document.createElement("a");
    link.className = "timeline-event-link";
    link.href = "event.html?id=" + encodeURIComponent(event.id);
    link.textContent = event.title;
    link.setAttribute("aria-label", "View event details for " + event.title);

    const dateLabel = document.createElement("span");
    dateLabel.className = "timeline-date-label";
    dateLabel.textContent = event.dateTime.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    item.appendChild(tick);
    item.appendChild(link);
    item.appendChild(dateLabel);
    track.appendChild(item);
  });

  let rafId = 0;
  function updateTimelineLayout() {
    rafId = 0;

    const items = Array.from(track.querySelectorAll(".timeline-event"));
    if (!items.length) return;

    const baseTickHeight = 22;
    const labelGap = 6;
    const horizontalGap = 18;
    const sidePadding = 72;
    const pixelsPerDay = 16;
    const today = new Date();
    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const rangeStart = Math.min(timelineEvents[0].dateTime.getTime(), todayTime);
    const rangeEnd = Math.max(timelineEvents[timelineEvents.length - 1].dateTime.getTime(), todayTime);
    const rangeDuration = Math.max(dayMs, rangeEnd - rangeStart);
    const totalDays = Math.max(1, Math.ceil(rangeDuration / dayMs));
    const trackWidth = Math.max(viewport.clientWidth - 1, totalDays * pixelsPerDay + sidePadding * 2);
    const usableWidth = Math.max(1, trackWidth - sidePadding * 2);
    const placedLabels = [];
    const placedDates = [];
    let maxTickHeight = baseTickHeight;
    let maxLabelHeight = 0;
    let maxDateHeight = 0;

    track.style.width = trackWidth + "px";

    items.forEach((item, index) => {
      const link = item.querySelector(".timeline-event-link");
      const dateLabel = item.querySelector(".timeline-date-label");
      const event = timelineEvents[index];
      if (!link || !dateLabel || !event) return;

      const ratio = (event.dateTime.getTime() - rangeStart) / rangeDuration;
      const naturalX = sidePadding + ratio * usableWidth;
      const labelWidth = link.offsetWidth;
      const labelHeight = link.offsetHeight;
      const dateWidth = dateLabel.offsetWidth;
      const dateHeight = dateLabel.offsetHeight;
      const minX = sidePadding + labelWidth / 2;
      const maxX = trackWidth - sidePadding - labelWidth / 2;
      const x = Math.max(minX, Math.min(maxX, naturalX));
      const startX = x - labelWidth / 2;
      const endX = x + labelWidth / 2;

      let tickHeight = baseTickHeight;
      let hasCollision = true;
      while (hasCollision) {
        hasCollision = false;
        const labelBottom = tickHeight + labelGap;
        const labelTop = labelBottom + labelHeight;
        for (const placed of placedLabels) {
          if (startX <= placed.endX + horizontalGap && endX >= placed.startX - horizontalGap) {
            if (labelBottom < placed.top && labelTop > placed.bottom) {
              hasCollision = true;
              tickHeight = placed.top - labelGap;
              break;
            }
          }
        }
      }
      placedLabels.push({ startX, endX, bottom: tickHeight + labelGap, top: tickHeight + labelGap + labelHeight + 4 });

      const dateStartX = x - dateWidth / 2;
      const dateEndX = x + dateWidth / 2;
      let dateTopOffset = 8;
      hasCollision = true;
      while (hasCollision) {
        hasCollision = false;
        const dateBottom = dateTopOffset + dateHeight;
        for (const placed of placedDates) {
          if (dateStartX <= placed.endX + 8 && dateEndX >= placed.startX - 8) {
            if (dateTopOffset < placed.bottom && dateBottom > placed.top) {
              hasCollision = true;
              dateTopOffset = placed.bottom;
              break;
            }
          }
        }
      }
      placedDates.push({ startX: dateStartX, endX: dateEndX, top: dateTopOffset, bottom: dateTopOffset + dateHeight + 2 });

      maxTickHeight = Math.max(maxTickHeight, tickHeight);
      maxLabelHeight = Math.max(maxLabelHeight, labelHeight);
      maxDateHeight = Math.max(maxDateHeight, dateTopOffset + dateHeight);

      item.style.left = x.toFixed(2) + "px";
      item.style.setProperty("--timeline-tick-height", tickHeight + "px");
      item.style.setProperty("--timeline-label-bottom", tickHeight + labelGap + "px");
      item.style.setProperty("--timeline-date-top", dateTopOffset + "px");
    });

    const todayRatio = (todayTime - rangeStart) / rangeDuration;
    const todayX = sidePadding + todayRatio * usableWidth;
    const targetScrollLeft = Math.max(0, Math.min(trackWidth - viewport.clientWidth, todayX - viewport.clientWidth / 2));
    viewport.scrollLeft = targetScrollLeft;
    
    updateTimelineHeight();
  }

  let heightRafId = 0;
  function updateTimelineHeight() {
    heightRafId = 0;
    const items = Array.from(track.querySelectorAll(".timeline-event"));
    if (!items.length) return;

    const scrollLeft = viewport.scrollLeft;
    const viewportWidth = viewport.clientWidth;
    const visibleStart = scrollLeft;
    const visibleEnd = scrollLeft + viewportWidth;

    let visibleMaxTickHeight = 22;
    let visibleMaxLabelHeight = 0;
    let visibleMaxDateHeight = 0;

    items.forEach((item) => {
      const x = parseFloat(item.style.left);
      const link = item.querySelector(".timeline-event-link");
      const dateLabel = item.querySelector(".timeline-date-label");
      if (!link || !dateLabel || isNaN(x)) return;

      // Check if item is roughly in view (adding buffer for label width)
      if (x >= visibleStart - 100 && x <= visibleEnd + 100) {
        const tickHeight = parseFloat(item.style.getPropertyValue("--timeline-tick-height"));
        const dateTop = parseFloat(item.style.getPropertyValue("--timeline-date-top"));
        
        visibleMaxTickHeight = Math.max(visibleMaxTickHeight, tickHeight);
        visibleMaxLabelHeight = Math.max(visibleMaxLabelHeight, link.offsetHeight);
        visibleMaxDateHeight = Math.max(visibleMaxDateHeight, dateTop + dateLabel.offsetHeight - 8);
      }
    });

    const bottomOffset = visibleMaxDateHeight + 16;
    track.style.setProperty("--timeline-bottom", bottomOffset + "px");
    track.style.height = visibleMaxTickHeight + visibleMaxLabelHeight + 6 + bottomOffset + 16 + "px";
  }

  function queueTimelineLayout() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(updateTimelineLayout);
  }
  
  function queueTimelineHeight() {
    if (heightRafId) return;
    heightRafId = window.requestAnimationFrame(updateTimelineHeight);
  }

  if (track.timelineController) {
    track.timelineController.abort();
  }
  track.timelineController = new AbortController();
  const signal = track.timelineController.signal;

  window.addEventListener("resize", queueTimelineLayout, { signal });
  viewport.addEventListener("scroll", queueTimelineHeight, { passive: true, signal });
  if (document.fonts) {
    document.fonts.ready.then(queueTimelineLayout);
  }
  
  queueTimelineLayout();
}

function setupStickyChips(viewport, track) {
  const shell = viewport.parentElement;
  shell.style.position = "relative";
  
  let chipsContainer = shell.querySelector(".status-chips-container");
  if (chipsContainer) {
    chipsContainer.remove();
  }
  
  chipsContainer = document.createElement("div");
  chipsContainer.className = "status-chips-container";
  chipsContainer.style.position = "absolute";
  chipsContainer.style.top = "0";
  chipsContainer.style.left = "0";
  chipsContainer.style.right = "0";
  chipsContainer.style.bottom = "0";
  chipsContainer.style.pointerEvents = "none";
  chipsContainer.style.zIndex = "10";
  chipsContainer.style.overflow = "hidden";
  shell.appendChild(chipsContainer);

  const groups = Array.from(track.querySelectorAll(".book-group"));
  const chipsData = [];

  groups.forEach((group) => {
    const status = group.getAttribute("data-status");
    const originalLabel = group.querySelector(".group-label");
    const wrap = group.querySelector(".group-label-wrap");
    
    if (!originalLabel) return;

    const chip = document.createElement("div");
    chip.className = "group-label";
    chip.textContent = originalLabel.textContent;
    chip.style.position = "absolute";
    chip.style.top = "0";
    chip.style.left = "0";
    chip.style.margin = "0";
    
    chipsContainer.appendChild(chip);
    
    chipsData.push({
      group,
      chip,
      originalLabel,
      wrap
    });
  });

  chipsData.forEach((data) => {
    data.originalLabel.style.visibility = "hidden";
  });

  let rafId = 0;

  function updateChips() {
    rafId = 0;
    const viewportRect = viewport.getBoundingClientRect();
    
    chipsData.forEach((data) => {
      const cards = Array.from(data.group.querySelectorAll(".book-link"));
      if (!cards.length) {
        data.chip.style.display = "none";
        return;
      }
      
      let minLeft = Infinity;
      let maxRight = -Infinity;
      
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.left < minLeft) minLeft = rect.left;
        if (rect.right > maxRight) maxRight = rect.right;
      });
      
      const sectionStart = minLeft - viewportRect.left;
      const sectionEnd = maxRight - viewportRect.left;
      const sectionCenter = (sectionStart + sectionEnd) / 2;
      
      const chipWidth = data.originalLabel.offsetWidth;
      const halfChip = chipWidth / 2;
      
      const padding = 16;
      const minCenter = halfChip + padding;
      const maxCenter = viewportRect.width - halfChip - padding;
      
      let chipX = sectionCenter;
      
      if (chipX < minCenter) chipX = minCenter;
      if (chipX > maxCenter) chipX = maxCenter;
      
      const maxAllowedX = sectionEnd - halfChip;
      const minAllowedX = sectionStart + halfChip;
      
      if (maxAllowedX < minAllowedX) {
        chipX = sectionCenter;
      } else {
        if (chipX > maxAllowedX) chipX = maxAllowedX;
        if (chipX < minAllowedX) chipX = minAllowedX;
      }
      
      if (sectionEnd < 0 || sectionStart > viewportRect.width) {
        data.chip.style.display = "none";
      } else {
        data.chip.style.display = "block";
        const originalRect = data.originalLabel.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const chipY = originalRect.top - shellRect.top;
        data.chip.style.transform = "translate(calc(" + chipX + "px - 50%), " + chipY + "px)";
      }
    });
  }

  function queueUpdate() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(updateChips);
  }

  viewport.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate);
  if (document.fonts) {
    document.fonts.ready.then(queueUpdate);
  }
  
  queueUpdate();
  setTimeout(queueUpdate, 100);
}

function setupTrackAlignment(viewport, track) {
  function updateTrackAlignment() {
    const fitsViewport = track.scrollWidth <= viewport.clientWidth + 1;
    track.classList.toggle("is-centered", fitsViewport);
  }

  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(updateTrackAlignment);
    resizeObserver.observe(viewport);
    resizeObserver.observe(track);
  }
  window.addEventListener("resize", updateTrackAlignment);
  window.requestAnimationFrame(updateTrackAlignment);
}

function setupInitialShelfCentering(viewport, track) {
  const currentGroup = track.querySelector('.book-group[data-status="current"]');
  if (!currentGroup) return;

  let hasCentered = false;

  function centerCurrentGroup() {
    if (hasCentered) return;

    const maxScrollLeft = Math.max(0, track.scrollWidth - viewport.clientWidth);
    if (maxScrollLeft <= 0) {
      hasCentered = true;
      return;
    }

    const groupCenter = currentGroup.offsetLeft + (currentGroup.offsetWidth / 2);
    const targetScrollLeft = Math.max(0, Math.min(maxScrollLeft, groupCenter - (viewport.clientWidth / 2)));
    viewport.scrollLeft = targetScrollLeft;
    hasCentered = true;
  }

  window.requestAnimationFrame(centerCurrentGroup);
  window.addEventListener("load", centerCurrentGroup, { once: true });
  if (document.fonts) {
    document.fonts.ready.then(centerCurrentGroup);
  }
}

function setupBookPerspective(viewport) {
  const bookNodes = Array.from(viewport.querySelectorAll(".book"));
  if (!bookNodes.length) return;

  let rafId = 0;

  function updatePerspective() {
    rafId = 0;
    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenterX = viewportRect.left + (viewportRect.width / 2);
    const halfWidth = Math.max(1, viewportRect.width / 2);

    bookNodes.forEach((bookNode) => {
      const rect = bookNode.getBoundingClientRect();
      const bookCenterX = rect.left + (rect.width / 2);
      const normalizedOffset = (bookCenterX - viewportCenterX) / halfWidth;
      const clamped = Math.max(-1, Math.min(1, normalizedOffset));
      const tilt = clamped * 3.5; // subtle lean at viewport edges
      bookNode.style.setProperty("--edge-lean", tilt.toFixed(3) + "deg");
    });
  }

  function queueUpdate() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(updatePerspective);
  }

  viewport.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate);
  queueUpdate();
}

function renderBookDetailPage() {
  const root = document.getElementById("book-detail-root");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const book = books.find((item) => item.id === id);

  if (!id || !book) {
    root.innerHTML =
      "<article class=\"not-found\">" +
      "<h1>Book not found</h1>" +
      "<p>The selected book could not be found. It may have moved or the link may be incorrect.</p>" +
      "<p><a href=\"index.html#books\">Return to the Books section</a></p>" +
      "</article>";
    return;
  }

  const bookEvents = getBookEvents(book);
  const now = new Date();
  const upcomingEvent = bookEvents.find((event) => event.dateTime.getTime() >= now.getTime()) || null;
  const tagsHtml = (book.tags || [])
    .map((tag) => "<span class=\"book-detail-tag-chip\">" + escapeHtml(String(tag)) + "</span>")
    .join("");
  const eventItemsHtml = bookEvents.length
    ? bookEvents
      .map((event) => {
        const suffix = event.dateTime.getTime() >= now.getTime()
          ? " <span class=\"meeting-chip meeting-chip-upcoming\">Upcoming</span>"
          : "";
        const note = event.note ? " <span class=\"meeting-note\">(" + escapeHtml(event.note) + ")</span>" : "";
        const location = event.location
          ? "<div class=\"meeting-meta\">" + escapeHtml(event.location) + "</div>"
          : "";
        return (
          "<li>" +
          "<a class=\"meeting-link\" href=\"event.html?id=" + encodeURIComponent(event.id) + "\">" +
          escapeHtml(formatDateTime(event.dateTime)) +
          "</a>" +
          note +
          suffix +
          location +
          "</li>"
        );
      })
      .join("")
    : "<li>No events scheduled yet.</li>";

  root.innerHTML =
    "<article class=\"book-detail\">" +
    "<a class=\"book-breadcrumb\" href=\"index.html#books\">&larr; Back to Books</a>" +
    "<div class=\"book-detail-layout\">" +
    "  <figure class=\"book-detail-cover\" id=\"detail-cover-wrap\">" +
    "    <img id=\"detail-cover\" src=\"" + escapeAttribute(book.cover) + "\" alt=\"" + escapeAttribute(book.title + " cover") + "\">" +
    "    <figcaption class=\"book-detail-fallback\">" + escapeHtml(book.title) + "</figcaption>" +
    "  </figure>" +
    "  <div class=\"book-detail-meta\">" +
    "    <h1>" + escapeHtml(book.title) + "</h1>" +
    "    <p class=\"book-detail-author\">by " + escapeHtml(book.author) + "</p>" +
    (tagsHtml ? "<div class=\"book-detail-tags\" aria-label=\"Book tags\">" + tagsHtml + "</div>" : "") +
    (upcomingEvent
      ? "<p class=\"book-detail-next\"><strong>Next meeting:</strong> "
        + "<a class=\"meeting-link\" href=\"event.html?id=" + encodeURIComponent(upcomingEvent.id) + "\">"
        + escapeHtml(formatDateTime(upcomingEvent.dateTime))
        + "</a>"
        + (upcomingEvent.note ? " <span class=\"meeting-note\">(" + escapeHtml(upcomingEvent.note) + ")</span>" : "")
        + "</p>"
      : "") +
    "    <section class=\"book-detail-section\">" +
    "      <h2>Overview</h2>" +
    "      <p>" + escapeHtml(book.description || book.shortDescription || "No description available.") + "</p>" +
    "    </section>" +
    "    <section class=\"book-detail-section\">" +
    "      <h2>Events</h2>" +
    "      <ul class=\"meeting-list\">" + eventItemsHtml + "</ul>" +
    "    </section>" +
    (book.notes
      ? "<section class=\"book-detail-section\"><h2>Discussion Notes</h2><p>" + escapeHtml(book.notes) + "</p></section>"
      : "") +
    "  </div>" +
    "</div>" +
    "</article>";

  const detailCover = document.getElementById("detail-cover");
  const detailWrap = document.getElementById("detail-cover-wrap");
  if (detailCover && detailWrap) {
    detailCover.onerror = function detailImageError() {
      detailWrap.classList.add("no-cover");
      detailCover.alt = "";
    };
  }

  document.title = book.title + " | Caltech Book Club";
}

function renderEventDetailPage() {
  const root = document.getElementById("event-detail-root");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const event = getEventById(id);
  const book = id ? getBookForEvent(id) : null;

  if (!id || !event) {
    root.innerHTML =
      "<article class=\"not-found\">" +
      "<h1>Event not found</h1>" +
      "<p>The selected event could not be found. It may have moved or the link may be incorrect.</p>" +
      "<p><a href=\"index.html#books\">Return to the Books section</a></p>" +
      "</article>";
    return;
  }

  const tagsHtml = event.tags
    .map((tag) => "<span class=\"book-detail-tag-chip\">" + escapeHtml(String(tag)) + "</span>")
    .join("");
  const bookSummary = book
    ? "<p class=\"book-detail-author\">Related book: <a class=\"meeting-link\" href=\"book.html?id="
      + encodeURIComponent(book.id)
      + "\">"
      + escapeHtml(book.title)
      + "</a> by "
      + escapeHtml(book.author)
      + "</p>"
    : "";
  const noteSection = event.note
    ? "<section class=\"book-detail-section\"><h2>Notes</h2><p>" + escapeHtml(event.note) + "</p></section>"
    : "";
  const relatedBookSection = book
    ? "<section class=\"book-detail-section\"><h2>About the Book</h2><p>"
      + escapeHtml(book.description || book.shortDescription || "No description available.")
      + "</p></section>"
    : "";
  const coverHtml = book
    ? "  <figure class=\"book-detail-cover\" id=\"detail-cover-wrap\">" +
      "    <img id=\"detail-cover\" src=\"" + escapeAttribute(book.cover) + "\" alt=\"" + escapeAttribute(book.title + " cover") + "\">" +
      "    <figcaption class=\"book-detail-fallback\">" + escapeHtml(book.title) + "</figcaption>" +
      "  </figure>"
    : "";

  root.innerHTML =
    "<article class=\"book-detail event-detail\">" +
    "<a class=\"book-breadcrumb\" href=\"" + (book ? "book.html?id=" + encodeURIComponent(book.id) : "index.html#books") + "\">&larr; "
      + (book ? "Back to Book" : "Back to Books") + "</a>" +
    "<div class=\"book-detail-layout\">" +
    coverHtml +
    "  <div class=\"book-detail-meta\">" +
    "    <h1>" + escapeHtml(event.title) + "</h1>" +
    bookSummary +
    (tagsHtml ? "<div class=\"book-detail-tags\" aria-label=\"Event tags\">" + tagsHtml + "</div>" : "") +
    "    <div class=\"event-meta-list\">" +
    "      <p><strong>When:</strong> " + escapeHtml(formatDateTime(event.dateTime)) + "</p>" +
    (event.location ? "      <p><strong>Where:</strong> " + escapeHtml(event.location) + "</p>" : "") +
    "    </div>" +
    noteSection +
    relatedBookSection +
    "  </div>" +
    "</div>" +
    "</article>";

  const detailCover = document.getElementById("detail-cover");
  const detailWrap = document.getElementById("detail-cover-wrap");
  if (detailCover && detailWrap) {
    detailCover.onerror = function detailImageError() {
      detailWrap.classList.add("no-cover");
      detailCover.alt = "";
    };
  }

  document.title = event.title + " | Caltech Book Club";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function setYear() {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
}

function initPage() {
  setYear();
  const page = document.body.getAttribute("data-page");
  if (page === "home") renderHomePage();
  if (page === "book") renderBookDetailPage();
  if (page === "event") renderEventDetailPage();
}

document.addEventListener("DOMContentLoaded", initPage);
