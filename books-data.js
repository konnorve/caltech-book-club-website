"use strict";

// Data-only file so non-technical maintainers can edit books in one place.
window.BOOKS = [
  {
    id: "one-hundred-years-of-solitude",
    title: "100 Years of Solitude",
    author: "Gabriel Garcia Marquez",
    cover: "https://covers.openlibrary.org/b/isbn/9780060883287-L.jpg",
    row: 1,
    tags: ["Weekly"],
    meetings: [
      "2025-04-15T19:30:00",
      "2025-04-22T19:30:00",
      "2025-04-29T19:30:00",
      "2025-05-06T19:30:00",
      "2025-05-13T19:30:00",
      "2025-05-20T19:30:00"
    ],
    shortDescription: "A landmark multigenerational novel of memory, myth, and history.",
    description: "A landmark multigenerational novel of memory, myth, and history."
  },
  {
    id: "for-whom-the-bell-tolls",
    title: "For Whom the Bell Tolls",
    author: "Ernest Hemingway",
    cover: "https://covers.openlibrary.org/b/isbn/9780684803357-L.jpg",
    row: 2,
    tags: ["Weekly"],
    meetings: [
      "2025-07-01T20:00:00",
      "2025-07-08T20:00:00",
      "2025-07-29T20:00:00",
      "2025-08-05T20:00:00",
      "2025-08-26T19:00:00"
    ],
    shortDescription: "War, loyalty, and sacrifice during the Spanish Civil War.",
    description: "War, loyalty, and sacrifice during the Spanish Civil War."
  },
  {
    id: "brave-new-world",
    title: "Brave New World",
    author: "Aldous Huxley",
    cover: "https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg",
    row: 1,
    tags: ["Weekly"],
    meetings: ["2025-09-09T19:00:00", "2025-09-23T19:00:00", "2025-10-07T19:00:00"],
    shortDescription: "A classic dystopia about control, desire, and social order.",
    description: "A classic dystopia about control, desire, and social order."
  },
  {
    id: "this-side-of-paradise",
    title: "This Side of Paradise",
    author: "F. Scott Fitzgerald",
    cover: "https://covers.openlibrary.org/b/id/11815957-L.jpg",
    row: 2,
    tags: ["Weekly"],
    meetings: [
      "2025-10-14T19:00:00",
      "2025-10-21T19:30:00",
      "2025-10-28T20:00:00",
      "2025-11-11T19:00:00",
      "2025-11-18T19:00:00"
    ],
    shortDescription: "A Jazz Age coming-of-age novel of ambition and identity.",
    description: "A Jazz Age coming-of-age novel of ambition and identity."
  },
  {
    id: "the-wind-up-bird-chronicle",
    title: "The Wind-Up Bird Chronicle",
    author: "Haruki Murakami",
    cover: "https://covers.openlibrary.org/b/isbn/9780679775430-L.jpg",
    row: 1,
    tags: ["Term"],
    meetings: ["2025-12-02T19:00:00"],
    shortDescription: "A surreal mystery unfolding through memory and absence.",
    description: "A surreal mystery unfolding through memory and absence."
  },
  {
    id: "the-center-cannot-hold",
    title: "The Center Cannot Hold",
    author: "Elyn R. Saks",
    cover: "https://covers.openlibrary.org/b/isbn/9781401309442-L.jpg",
    row: 2,
    tags: ["Term"],
    meetings: ["2026-01-13T19:00:00"],
    shortDescription: "A memoir of schizophrenia, resilience, and the mind.",
    description: "A memoir of schizophrenia, resilience, and the mind."
  },
  {
    id: "welcome-to-the-monkey-house",
    title: "Welcome to the Monkey House",
    author: "Kurt Vonnegut",
    cover: "https://covers.openlibrary.org/b/id/6633930-L.jpg",
    row: 1,
    tags: ["Weekly"],
    meetings: [
      "2026-01-27T19:00:00",
      "2026-02-03T19:00:00",
      "2026-02-10T19:00:00",
      "2026-02-17T19:00:00",
      "2026-02-24T19:00:00"
    ],
    shortDescription: "Satirical short fiction with sharp social critique.",
    description: "Satirical short fiction with sharp social critique."
  },
  {
    id: "the-secret-history",
    title: "The Secret History",
    author: "Donna Tartt",
    cover: "https://covers.openlibrary.org/b/id/744854-L.jpg",
    row: 2,
    tags: ["Monthly"],
    meetings: ["2026-02-26T19:00:00"],
    shortDescription: "An elegant campus novel about obsession and consequence.",
    description: "An elegant campus novel about obsession and consequence."
  },
  {
    id: "the-last-lecture",
    title: "The Last Lecture",
    author: "Randy Pausch",
    cover: "https://covers.openlibrary.org/b/isbn/9781401323257-L.jpg",
    row: 2,
    tags: ["Monthly"],
    meetings: ["2026-03-19T18:00:00"],
    shortDescription: "A reflective talk on curiosity, purpose, and resilience.",
    description: "A reflective talk on curiosity, purpose, and resilience."
  },
  {
    id: "east-of-eden",
    title: "East of Eden",
    author: "John Steinbeck",
    cover: "https://covers.openlibrary.org/b/isbn/9780142004234-L.jpg",
    row: 1,
    tags: ["Weekly"],
    meetings: [
      "2026-03-17T19:00:00",
      "2026-03-24T19:00:00",
      { dateTime: "2026-03-31T19:00:00", note: "End of Chapter 15" },
      "2026-04-07T19:00:00",
      "2026-04-14T19:00:00",
      "2026-04-21T19:00:00"
    ],
    shortDescription: "A sweeping family epic on inheritance, choice, and moral struggle.",
    description: "A sweeping family epic on inheritance, choice, and moral struggle."
  },
  {
    id: "silent-spring",
    title: "The Silent Spring",
    author: "Rachel Carson",
    cover: "https://covers.openlibrary.org/b/isbn/9780618249060-L.jpg",
    row: 2,
    tags: ["Monthly"],
    meetings: ["2026-04-30T18:00:00"],
    shortDescription: "Foundational environmental writing that changed public policy.",
    description: "Foundational environmental writing that changed public policy."
  },
  {
    id: "hitchhikers-guide-to-the-galaxy",
    title: "The Hitchhiker's Guide to the Galaxy",
    author: "Douglas Adams",
    cover: "https://covers.openlibrary.org/b/isbn/9780345391803-L.jpg",
    row: 1,
    tags: ["Monthly"],
    meetings: ["2026-05-28T18:00:00"],
    shortDescription: "Comic science fiction about chance, absurdity, and survival.",
    description: "Comic science fiction about chance, absurdity, and survival."
  },
  {
    id: "surely-youre-joking-mr-feynman",
    title: "Surely You're Joking, Mr. Feynman!",
    author: "Richard P. Feynman",
    cover: "https://covers.openlibrary.org/b/isbn/9780393355628-L.jpg",
    row: 2,
    tags: ["Monthly"],
    meetings: ["2026-06-25T18:00:00"],
    shortDescription: "Memoirs of curiosity, playfulness, and scientific thinking.",
    description: "Memoirs of curiosity, playfulness, and scientific thinking."
  },
  {
    id: "the-silent-patient",
    title: "The Silent Patient",
    author: "Alex Michaelides",
    cover: "https://covers.openlibrary.org/b/isbn/9781250301697-L.jpg",
    row: 1,
    tags: ["Monthly"],
    meetings: ["2026-07-30T18:00:00"],
    shortDescription: "A psychological thriller centered on silence and testimony.",
    description: "A psychological thriller centered on silence and testimony."
  },
  {
    id: "the-help",
    title: "The Help",
    author: "Kathryn Stockett",
    cover: "https://covers.openlibrary.org/b/isbn/9780425232200-L.jpg",
    row: 1,
    tags: ["Monthly"],
    meetings: ["2026-09-24T18:00:00"],
    shortDescription: "A novel of race, voice, and friendship in 1960s Mississippi.",
    description: "A novel of race, voice, and friendship in 1960s Mississippi."
  },
  {
    id: "abundance",
    title: "Abundance",
    author: "Ezra Klein and Derek Thompson",
    cover: "https://covers.openlibrary.org/b/isbn/9781668023488-L.jpg",
    row: 2,
    tags: ["Monthly"],
    meetings: ["2026-08-27T18:00:00"],
    shortDescription: "Contemporary nonfiction on growth, systems, and policy choices.",
    description: "Contemporary nonfiction on growth, systems, and policy choices."
  }
];
