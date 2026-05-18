#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function createSandbox() {
  return {
    window: {},
    document: {
      addEventListener() {},
      body: {
        getAttribute() {
          return "";
        }
      },
      createElement() {
        return {
          appendChild() {},
          setAttribute() {},
          style: {}
        };
      },
      getElementById() {
        return null;
      },
      head: {
        appendChild() {}
      }
    },
    URL,
    URLSearchParams
  };
}

function loadSiteContext() {
  const sandbox = createSandbox();
  vm.createContext(sandbox);

  ["books-data.js", "bookshelf.js"].forEach((fileName) => {
    const source = fs.readFileSync(path.join(rootDir, fileName), "utf8");
    vm.runInContext(source, sandbox, { filename: fileName });
  });

  return sandbox;
}

function getStatus(sandbox, bookId, date) {
  return vm.runInContext(
    `getBookStatus(booksById.get(${JSON.stringify(bookId)}), new Date(${JSON.stringify(date)}))`,
    sandbox
  );
}

function getTimelinePositions(sandbox) {
  return vm.runInContext(
    `(() => {
      const range = getTimelineRange([
        { dateTime: new Date("2026-01-01T19:00:00") },
        { dateTime: new Date("2026-01-08T12:00:00") },
        { dateTime: new Date("2026-01-22T08:00:00") }
      ], new Date("2026-01-01T00:00:00"));

      return {
        jan1: getTimelineDateX(new Date("2026-01-01T19:00:00"), range, 50, 210),
        jan8Morning: getTimelineDateX(new Date("2026-01-08T08:00:00"), range, 50, 210),
        jan8Night: getTimelineDateX(new Date("2026-01-08T23:00:00"), range, 50, 210),
        jan22: getTimelineDateX(new Date("2026-01-22T08:00:00"), range, 50, 210)
      };
    })()`,
    sandbox
  );
}

const sandbox = loadSiteContext();

assert.strictEqual(
  getStatus(sandbox, "east-of-eden", "2026-05-12T12:00:00"),
  "current",
  "East of Eden should remain current while it still has upcoming meetings"
);
assert.strictEqual(
  getStatus(sandbox, "the-temple-of-the-golden-pavilion", "2026-05-12T12:00:00"),
  "future",
  "The next weekly book should not take over before the current weekly book ends"
);
assert.strictEqual(
  getStatus(sandbox, "east-of-eden", "2026-05-18T12:00:00"),
  "past",
  "A finished weekly book should move to past once the next weekly book is scheduled soon"
);
assert.strictEqual(
  getStatus(sandbox, "the-temple-of-the-golden-pavilion", "2026-05-18T12:00:00"),
  "current",
  "The next scheduled weekly book should become current during the transition window"
);

const timelinePositions = getTimelinePositions(sandbox);
assert.strictEqual(
  timelinePositions.jan8Morning,
  timelinePositions.jan8Night,
  "Events on the same calendar date should share one timeline position"
);
assert(
  Math.abs((timelinePositions.jan8Morning - timelinePositions.jan1) * 3 - (timelinePositions.jan22 - timelinePositions.jan1)) < 0.0001,
  "Timeline spacing should remain proportional to elapsed calendar days"
);

console.log("Book status tests passed.");
