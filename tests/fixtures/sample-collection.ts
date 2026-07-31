// Synthetic collection & wantlist fixtures used by unit tests (lib/data)
// and by the Playwright global setup that seeds the file cache. Everything
// is hand-crafted so it exercises the aggregation code paths without
// requiring anyone's real Discogs data.
//
// If you add a new test that needs a new shape, extend these fixtures
// rather than inventing fresh ad-hoc ones — the two consumers stay in
// lockstep that way.

import type {
  CollectionRelease,
  CustomField,
  Folder,
  ProcessedWantlistItem,
  SyncInfo,
  WantlistPricesMap,
} from "@/lib/types";

let nextId = 1;
const id = () => nextId++;

type MakeReleaseOpts = {
  title: string;
  artist: string;
  label?: string;
  year: number;
  format?: string;
  masterId?: number;
  styles?: string[];
  condition?: string;
};

const makeRelease = (o: MakeReleaseOpts): CollectionRelease => {
  const releaseId = id();
  return {
    id: releaseId,
    instance_id: id(),
    date_added: `2024-01-${String(releaseId).padStart(2, "0")}T12:00:00Z`,
    rating: 0,
    folder_id: 0,
    basic_information: {
      id: releaseId,
      master_id: o.masterId ?? 0,
      master_url: "",
      resource_url: "",
      thumb: "",
      cover_image: "",
      title: o.title,
      year: o.year,
      formats: [
        {
          name: o.format ?? "Vinyl",
          qty: "1",
          descriptions: ["LP", "Album"],
        },
      ],
      labels: o.label
        ? [
            {
              name: o.label,
              catno: "TEST-001",
              entity_type: "1",
              id: id(),
              resource_url: "",
            },
          ]
        : [],
      artists: [
        {
          name: o.artist,
          anv: "",
          join: "",
          role: "",
          tracks: "",
          id: id(),
          resource_url: "",
        },
      ],
    },
    details: {
      styles: o.styles ?? [],
      genres: [],
    },
    notes: o.condition
      ? [
          {
            field_id: 1,
            value: o.condition,
          },
        ]
      : [],
  };
};

// A compact but varied collection — enough distinct artists/labels/styles/
// decades/formats/conditions that every branch of getCollectionStats has
// something to aggregate. Includes a duplicate-master pair (releases 2 & 3
// share master 42) so /duplicates has something to show.
export const sampleCollection: CollectionRelease[] = [
  makeRelease({
    title: "Kind of Blue",
    artist: "Miles Davis",
    label: "Columbia",
    year: 1959,
    styles: ["Cool Jazz", "Modal"],
    format: "Vinyl",
    condition: "Near Mint (NM or M-)",
  }),
  makeRelease({
    title: "Sketches of Spain",
    artist: "Miles Davis",
    label: "Columbia",
    year: 1960,
    masterId: 42,
    styles: ["Cool Jazz"],
    format: "LP",
    condition: "Very Good Plus (VG+)",
  }),
  makeRelease({
    title: "Sketches of Spain (Reissue)",
    artist: "Miles Davis",
    label: "Columbia",
    year: 1997,
    masterId: 42,
    styles: ["Cool Jazz"],
    format: "LP",
    condition: "Near Mint (NM or M-)",
  }),
  makeRelease({
    title: "A Love Supreme",
    artist: "John Coltrane",
    label: "Impulse!",
    year: 1965,
    styles: ["Free Jazz", "Modal"],
    format: "Vinyl",
    condition: "Very Good (VG)",
  }),
  makeRelease({
    title: "Blue Train",
    artist: "John Coltrane",
    label: "Blue Note",
    year: 1957,
    styles: ["Hard Bop"],
    format: "Vinyl",
    condition: "Near Mint (NM or M-)",
  }),
  makeRelease({
    title: "The Dark Side of the Moon",
    artist: "Pink Floyd",
    label: "Harvest",
    year: 1973,
    styles: ["Prog Rock", "Psychedelic Rock"],
    format: "Vinyl",
    condition: "Very Good Plus (VG+)",
  }),
  makeRelease({
    title: "Wish You Were Here",
    artist: "Pink Floyd",
    label: "Harvest",
    year: 1975,
    styles: ["Prog Rock"],
    format: "CD",
    condition: "Near Mint (NM or M-)",
  }),
  makeRelease({
    title: "Rumours",
    artist: "Fleetwood Mac",
    label: "Warner Bros.",
    year: 1977,
    styles: ["Pop Rock"],
    format: "Vinyl",
  }),
  makeRelease({
    title: "Various — Jazz Sampler",
    artist: "Various",
    label: "Blue Note",
    year: 1980,
    styles: ["Hard Bop", "Cool Jazz"],
    format: "Vinyl",
  }),
  makeRelease({
    title: 'Untitled 12"',
    artist: "Aphex Twin",
    label: "Warp",
    year: 1994,
    styles: ["IDM"],
    format: '12"',
    condition: "Near Mint (NM or M-)",
  }),
];

export const sampleWantlist: ProcessedWantlistItem[] = [
  {
    id: 9001,
    resource_url: "",
    rating: 0,
    date_added: "2024-06-01T00:00:00Z",
    basic_information: {
      id: 9001,
      master_id: 5001,
      master_url: "",
      resource_url: "",
      thumb: "",
      cover_image: "",
      title: "Bitches Brew",
      year: 1970,
      formats: [{ name: "Vinyl", qty: "2", descriptions: ["2xLP"] }],
      labels: [
        {
          name: "Columbia",
          catno: "GP 26",
          entity_type: "1",
          id: 500,
          resource_url: "",
        },
      ],
      artists: [
        {
          name: "Miles Davis",
          anv: "",
          join: "",
          role: "",
          tracks: "",
          id: 100,
          resource_url: "",
        },
      ],
    },
    details: { styles: ["Fusion", "Jazz-Rock"], genres: ["Jazz"] },
    master_cover_image: "",
    master_year: 1970,
  },
];

export const sampleFolders: Folder[] = [
  { id: 0, name: "All", count: sampleCollection.length, resource_url: "" },
  { id: 1, name: "Uncategorized", count: 3, resource_url: "" },
];

export const sampleCustomFields: CustomField[] = [
  {
    id: 1,
    name: "Media Condition",
    type: "dropdown",
    public: true,
    options: [
      "Mint (M)",
      "Near Mint (NM or M-)",
      "Very Good Plus (VG+)",
      "Very Good (VG)",
    ],
  },
];

export const sampleWantlistPrices: WantlistPricesMap = {
  9001: {
    release_id: 9001,
    lowest_price: 350,
    currency: "NOK",
    num_for_sale: 4,
    blocked_from_sale: false,
    fetched_at: "2024-06-01T12:00:00Z",
  },
};

export const sampleSyncInfo: SyncInfo = {
  collectionLastAdded: "2024-06-01T12:00:00Z",
  wantlistLastAdded: "2024-06-01T12:00:00Z",
};
