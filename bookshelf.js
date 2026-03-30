"use strict";

/*
  Shared Caltech Book Club rendering logic
  for both index.html (bookshelf) and book.html (detail page).
*/
const books = Array.isArray(window.BOOKS) ? window.BOOKS : [];

const statusMeta = {
  past: { label: "Past", className: "is-past" },
  current: { label: "Current", className: "is-current" },
  future: { label: "Future", className: "is-future" }
};

function parseBookDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  const raw = String(value);
  const normalized = raw.includes("T") ? raw : raw + "T00:00:00";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getBookMeetings(book) {
  if (!Array.isArray(book.meetings)) return [];
  const normalized = book.meetings
    .map((entry) => {
      if (typeof entry === "string") {
        const date = parseBookDate(entry);
        if (!date) return null;
        return { date: date, note: "" };
      }
      if (entry && typeof entry === "object") {
        const date = parseBookDate(entry.dateTime || entry.date);
        if (!date) return null;
        return { date: date, note: entry.note ? String(entry.note) : "" };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return normalized;
}

function getBookMeetingDates(book) {
  return getBookMeetings(book).map((meeting) => meeting.date);
}

function hasTag(book, tag) {
  if (!Array.isArray(book.tags)) return false;
  return book.tags.some((bookTag) => String(bookTag).toLowerCase() === tag);
}

function getBookStatus(book, referenceDate) {
  const now = referenceDate || new Date();
  const meetings = getBookMeetingDates(book);
  if (!meetings.length) return "future";

  const nowTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const pastMeetings = meetings.filter((d) => d.getTime() < nowTime);
  const futureMeetings = meetings.filter((d) => d.getTime() >= nowTime);

  if (pastMeetings.length && futureMeetings.length) return "current";
  if (pastMeetings.length && !futureMeetings.length) {
    if (hasTag(book, "weekly")) {
      const latestMeeting = pastMeetings[pastMeetings.length - 1];
      const recencyDays = Math.ceil((nowTime - latestMeeting.getTime()) / (1000 * 60 * 60 * 24));
      if (recencyDays <= 14) return "current";
    }
    return "past";
  }

  if (futureMeetings.length) {
    const nearestFuture = futureMeetings.reduce((min, d) => (d < min ? d : min), futureMeetings[0]);
    const diffDays = Math.ceil((nearestFuture.getTime() - nowTime) / (1000 * 60 * 60 * 24));
    if (hasTag(book, "monthly") && diffDays <= 35) return "current";
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

function formatDateTime(date) {
  const datePart = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timePart = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return datePart + " at " + timePart;
}

function getShelfMeetingLabel(book, now) {
  const meetings = getBookMeetings(book);
  if (!meetings.length) return "No meetings scheduled";

  const nowDate = now || new Date();
  const upcoming = meetings.find((meeting) => meeting.date.getTime() >= nowDate.getTime()) || null;
  if (upcoming) {
    return "Next meeting: " + formatDateTime(upcoming.date);
  }

  const latest = meetings[meetings.length - 1];
  return "Last meeting: " + formatDateTime(latest.date);
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

  const bookMeetings = getBookMeetings(book);
  const meetingDates = bookMeetings.map((meeting) => meeting.date);
  const now = new Date();
  const upcomingMeeting = bookMeetings.find((meeting) => meeting.date.getTime() >= now.getTime()) || null;
  const tagsHtml = (book.tags || [])
    .map((tag) => "<span class=\"book-detail-tag-chip\">" + escapeHtml(String(tag)) + "</span>")
    .join("");
  const meetingItemsHtml = bookMeetings.length
    ? bookMeetings
      .map((meeting) => {
        const suffix = meeting.date.getTime() >= now.getTime()
          ? " <span class=\"meeting-chip meeting-chip-upcoming\">Upcoming</span>"
          : "";
        const note = meeting.note ? " <span class=\"meeting-note\">(" + escapeHtml(meeting.note) + ")</span>" : "";
        return "<li>" + escapeHtml(formatDateTime(meeting.date)) + note + suffix + "</li>";
      })
      .join("")
    : "<li>No meetings scheduled yet.</li>";

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
    (upcomingMeeting
      ? "<p class=\"book-detail-next\"><strong>Next meeting:</strong> "
        + escapeHtml(formatDateTime(upcomingMeeting.date))
        + (upcomingMeeting.note ? " <span class=\"meeting-note\">(" + escapeHtml(upcomingMeeting.note) + ")</span>" : "")
        + "</p>"
      : "") +
    "    <section class=\"book-detail-section\">" +
    "      <h2>Overview</h2>" +
    "      <p>" + escapeHtml(book.description || book.shortDescription || "No description available.") + "</p>" +
    "    </section>" +
    "    <section class=\"book-detail-section\">" +
    "      <h2>Meetings</h2>" +
    "      <ul class=\"meeting-list\">" + meetingItemsHtml + "</ul>" +
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
}

document.addEventListener("DOMContentLoaded", initPage);
