"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  Folder,
  CustomField,
  WantlistPricesMap,
} from "@/lib/types";
import Grid from "./Grid";
import SortControls, {
  type SortKey,
  type SortOrder,
  type View,
} from "./SortControls";
import AlbumList from "./AlbumList";
import FilterSidebar from "./FilterSidebar";
import BestBuysPanel from "./BestBuysPanel";
import { useFinnCounts } from "@/hooks/useFinnCounts";

interface AlbumViewerProps {
  items: (CollectionRelease | ProcessedWantlistItem)[];
  viewType: "collection" | "wantlist";
  collectionItemsForFiltering?: CollectionRelease[];
  folders: Folder[];
  customFields: CustomField[];
  wantlistPrices?: WantlistPricesMap;
}

const AlbumViewer: React.FC<AlbumViewerProps> = ({
  items,
  viewType,
  collectionItemsForFiltering,
  folders,
  customFields,
  wantlistPrices,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>("date_added");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showOnlyInCollection, setShowOnlyInCollection] = useState(false);
  const [view, setView] = useState<View>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [showOnlyFinnHits, setShowOnlyFinnHits] = useState(false);

  // Seed filter state from URL search params (e.g. links from the /stats
  // page: `/collection?style=Jazz`, `?decade=1970s`, `?artist=X`,
  // `?label=Y`, `?format=Vinyl,LP,12"`). Reads params synchronously so
  // initial render is already filtered — no flash of unfiltered content.
  const searchParams = useSearchParams();
  const readList = useCallback(
    (key: string) =>
      searchParams
        ?.get(key)
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
    [searchParams],
  );
  const initialYearsFromParams = useCallback((): Set<number> => {
    const decade = searchParams?.get("decade");
    if (decade) {
      const m = decade.match(/^(\d{4})s?$/);
      if (m) {
        const start = parseInt(m[1], 10);
        const years = new Set<number>();
        for (let y = start; y < start + 10; y++) years.add(y);
        return years;
      }
    }
    const yearParam = readList("year");
    if (yearParam.length) {
      return new Set(yearParam.map((y) => parseInt(y, 10)));
    }
    return new Set();
  }, [searchParams, readList]);

  const [selectedArtists, setSelectedArtists] = useState<Set<string>>(
    () => new Set(readList("artist")),
  );
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(
    () => new Set(readList("format")),
  );
  const [selectedYears, setSelectedYears] = useState<Set<number>>(
    initialYearsFromParams,
  );
  const [selectedFolders, setSelectedFolders] = useState<Set<number>>(
    new Set(),
  );
  const [selectedComposers, setSelectedComposers] = useState<Set<string>>(
    new Set(),
  );
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(
    () => new Set(readList("style")),
  );
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(
    () => new Set(readList("label")),
  );
  const [selectedCustomFields, setSelectedCustomFields] = useState<
    Record<string, Set<string>>
  >({});

  // If the URL changes after mount (e.g. user clicks a different stats
  // link while already on /collection), re-seed the filter state.
  const searchParamsKey = searchParams?.toString() ?? "";
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSelectedArtists(new Set(readList("artist")));
    setSelectedFormats(new Set(readList("format")));
    setSelectedStyles(new Set(readList("style")));
    setSelectedLabels(new Set(readList("label")));
    setSelectedYears(initialYearsFromParams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsKey]);

  const handleSortOrderChange = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const collectionMasterIds = useMemo(() => {
    if (viewType !== "wantlist" || !collectionItemsForFiltering)
      return new Set<number>();
    const ids = new Set<number>();
    for (const item of collectionItemsForFiltering) {
      if (item.basic_information.master_id > 0) {
        ids.add(item.basic_information.master_id);
      }
    }
    return ids;
  }, [collectionItemsForFiltering, viewType]);

  const uniqueWantlistItems = useMemo(() => {
    if (viewType !== "wantlist") return items;
    const uniqueItems: ProcessedWantlistItem[] = [];
    const seenIds = new Set<number>();
    for (const item of items as ProcessedWantlistItem[]) {
      const masterId = item.basic_information.master_id;
      if (masterId > 0 && !seenIds.has(masterId)) {
        seenIds.add(masterId);
        uniqueItems.push(item);
      }
    }
    return uniqueItems;
  }, [items, viewType]);

  // Taste signals: how strongly each artist/label/style is represented in the
  // user's collection. Used by BestBuysPanel to rank wantlist items by fit,
  // not just by price.
  const tasteSignals = useMemo(() => {
    const artistCounts = new Map<string, number>();
    const labelCounts = new Map<string, number>();
    const styleCounts = new Map<string, number>();
    const genreCounts = new Map<string, number>();

    if (viewType !== "wantlist" || !collectionItemsForFiltering) {
      return { artistCounts, labelCounts, styleCounts, genreCounts };
    }

    const bump = (map: Map<string, number>, key: string | undefined) => {
      if (!key) return;
      map.set(key, (map.get(key) ?? 0) + 1);
    };

    for (const item of collectionItemsForFiltering) {
      const info = item.basic_information;
      for (const a of info.artists ?? []) bump(artistCounts, a.name);
      for (const l of info.labels ?? []) bump(labelCounts, l.name);
      for (const s of item.details?.styles ?? []) bump(styleCounts, s);
      for (const g of item.details?.genres ?? []) bump(genreCounts, g);
    }
    return { artistCounts, labelCounts, styleCounts, genreCounts };
  }, [collectionItemsForFiltering, viewType]);

  // Pressings-wanted count: how many wantlist rows share a master_id.
  // High count = strong "I want this album" signal regardless of pressing.
  const pressingCounts = useMemo(() => {
    const counts = new Map<number, number>();
    if (viewType !== "wantlist") return counts;
    for (const item of items as ProcessedWantlistItem[]) {
      const masterId = item.basic_information.master_id;
      if (masterId > 0) counts.set(masterId, (counts.get(masterId) ?? 0) + 1);
    }
    return counts;
  }, [items, viewType]);

  const { counts: finnCounts } = useFinnCounts(
    viewType === "wantlist"
      ? (uniqueWantlistItems as ProcessedWantlistItem[])
      : [],
  );

  const sortedAndFilteredItems = useMemo(() => {
    let itemsToDisplay = viewType === "wantlist" ? uniqueWantlistItems : items;

    // --- Sidebar Filtering ---
    itemsToDisplay = itemsToDisplay.filter((item) => {
      const info = item.basic_information;
      const artistName = info.artists?.[0]?.name;
      const formatName = info.formats?.[0]?.name;
      const primaryLabel = info.labels?.[0]?.name;
      const itemStyles = item.details?.styles ?? [];
      const year =
        "master_year" in item && item.master_year
          ? item.master_year
          : info.year;
      const folderId = "folder_id" in item ? item.folder_id : -1;
      const composers =
        item.details?.extraartists
          ?.filter((artist) => artist.role === "Composed By")
          .map((artist) => artist.name) || [];

      if (
        selectedArtists.size > 0 &&
        (!artistName || !selectedArtists.has(artistName))
      )
        return false;
      if (
        selectedComposers.size > 0 &&
        !composers.some((composer) => selectedComposers.has(composer))
      )
        return false;
      if (
        selectedFormats.size > 0 &&
        (!formatName || !selectedFormats.has(formatName))
      )
        return false;
      if (
        selectedStyles.size > 0 &&
        !itemStyles.some((s) => selectedStyles.has(s))
      )
        return false;
      if (
        selectedLabels.size > 0 &&
        (!primaryLabel || !selectedLabels.has(primaryLabel))
      )
        return false;
      if (selectedYears.size > 0 && (!year || !selectedYears.has(year)))
        return false;
      if (
        selectedFolders.size > 0 &&
        (folderId === -1 || !selectedFolders.has(folderId))
      )
        return false;

      for (const field of customFields) {
        const selectedOptions = selectedCustomFields[field.name];
        if (selectedOptions && selectedOptions.size > 0) {
          const itemValue = (item as CollectionRelease).notes?.find(
            (n) => n.field_id === field.id,
          )?.value;
          if (!itemValue || !selectedOptions.has(itemValue)) {
            return false;
          }
        }
      }

      return true;
    });

    // --- Search Filtering ---
    if (searchQuery.trim() !== "") {
      const lowercasedQuery = searchQuery.toLowerCase();
      itemsToDisplay = itemsToDisplay.filter((item) => {
        const info = item.basic_information;
        const details = item.details;

        const check = (str: string | undefined | null) =>
          str?.toLowerCase().includes(lowercasedQuery);
        const checkArr = (arr: string[] | undefined) =>
          arr?.some((s) => s.toLowerCase().includes(lowercasedQuery));

        if (check(info.title)) return true;
        if (info.year?.toString().includes(lowercasedQuery)) return true;
        if (info.artists?.some((a) => check(a.name))) return true;
        if (info.labels?.some((l) => check(l.name) || check(l.catno)))
          return true;
        if (
          info.formats?.some((f) => check(f.name) || checkArr(f.descriptions))
        )
          return true;

        if (details) {
          if (details.extraartists?.some((a) => check(a.name) || check(a.role)))
            return true;
          if (checkArr(details.genres)) return true;
          if (checkArr(details.styles)) return true;
          if (check(details.notes)) return true;
        }

        return false;
      });
    }

    // --- Other Filtering ---
    if (viewType === "wantlist" && showOnlyInCollection) {
      itemsToDisplay = itemsToDisplay.filter((item) => {
        const masterId = item.basic_information.master_id;
        return masterId > 0 && collectionMasterIds.has(masterId);
      });
    }

    if (viewType === "wantlist" && showOnlyFinnHits) {
      itemsToDisplay = itemsToDisplay.filter((item) => {
        const count = finnCounts.get(item.id);
        return count != null && count > 0;
      });
    }

    // --- Sorting ---
    return [...itemsToDisplay].sort((a, b) => {
      const aInfo = a.basic_information;
      const bInfo = b.basic_information;
      let compareA: string | number;
      let compareB: string | number;

      switch (sortKey) {
        case "artist":
          compareA = aInfo.artists?.[0]?.name.toLocaleLowerCase() || "";
          compareB = bInfo.artists?.[0]?.name.toLocaleLowerCase() || "";
          break;
        case "year":
          compareA =
            "master_year" in a && a.master_year
              ? a.master_year
              : aInfo.year || 0;
          compareB =
            "master_year" in b && b.master_year
              ? b.master_year
              : bInfo.year || 0;
          break;
        case "date_added":
          const dateA = "date_added" in a ? a.date_added : 0;
          const dateB = "date_added" in b ? b.date_added : 0;
          compareA = new Date(dateA).getTime();
          compareB = new Date(dateB).getTime();
          break;
        case "title":
        default:
          compareA = aInfo.title
            .replace(/^(the|a|an)\s+/i, "")
            .toLocaleLowerCase();
          compareB = bInfo.title
            .replace(/^(the|a|an)\s+/i, "")
            .toLocaleLowerCase();
      }

      const direction = sortOrder === "asc" ? 1 : -1;

      if (typeof compareA === "string" && typeof compareB === "string") {
        return compareA.localeCompare(compareB) * direction;
      }
      if (compareA < compareB) return -1 * direction;
      if (compareA > compareB) return 1 * direction;
      return 0;
    });
  }, [
    items,
    uniqueWantlistItems,
    sortKey,
    sortOrder,
    showOnlyInCollection,
    showOnlyFinnHits,
    finnCounts,
    viewType,
    collectionMasterIds,
    searchQuery,
    selectedArtists,
    selectedFormats,
    selectedYears,
    selectedFolders,
    selectedComposers,
    selectedStyles,
    selectedLabels,
    selectedCustomFields,
    customFields,
  ]);

  const activeFilters = {
    artists: selectedArtists,
    formats: selectedFormats,
    years: selectedYears,
    folders: selectedFolders,
    composers: selectedComposers,
    styles: selectedStyles,
    labels: selectedLabels,
    customFields: selectedCustomFields,
  };

  const onFilterChange = (
    type: "artists" | "formats" | "years" | "folders" | "composers" | string,
    value: string | number,
    isSelected: boolean,
  ) => {
    const updater = (
      setter: React.Dispatch<React.SetStateAction<Set<any>>>,
    ) => {
      setter((prev) => {
        const newSet = new Set(prev);
        if (isSelected) {
          newSet.add(value);
        } else {
          newSet.delete(value);
        }
        return newSet;
      });
    };

    const customFieldUpdater = (fieldName: string) => {
      setSelectedCustomFields((prev) => {
        const newSet = new Set(prev[fieldName]);
        if (isSelected) {
          newSet.add(value as string);
        } else {
          newSet.delete(value as string);
        }
        return {
          ...prev,
          [fieldName]: newSet,
        };
      });
    };

    switch (type) {
      case "artists":
        updater(setSelectedArtists);
        break;
      case "formats":
        updater(setSelectedFormats);
        break;
      case "years":
        updater(setSelectedYears);
        break;
      case "folders":
        updater(setSelectedFolders);
        break;
      case "composers":
        updater(setSelectedComposers);
        break;
      case "styles":
        updater(setSelectedStyles);
        break;
      case "labels":
        updater(setSelectedLabels);
        break;
      default:
        customFieldUpdater(type);
    }
  };

  const onFilterClear = (
    type:
      | "artists"
      | "formats"
      | "years"
      | "folders"
      | "composers"
      | "styles"
      | "labels"
      | "all"
      | string,
  ) => {
    if (type === "artists" || type === "all") setSelectedArtists(new Set());
    if (type === "formats" || type === "all") setSelectedFormats(new Set());
    if (type === "years" || type === "all") setSelectedYears(new Set());
    if (type === "folders" || type === "all") setSelectedFolders(new Set());
    if (type === "composers" || type === "all") setSelectedComposers(new Set());
    if (type === "styles" || type === "all") setSelectedStyles(new Set());
    if (type === "labels" || type === "all") setSelectedLabels(new Set());
    if (type === "all") {
      setSelectedCustomFields({});
    } else if (
      type !== "artists" &&
      type !== "formats" &&
      type !== "years" &&
      type !== "folders" &&
      type !== "composers" &&
      type !== "styles" &&
      type !== "labels"
    ) {
      setSelectedCustomFields((prev) => ({ ...prev, [type]: new Set() }));
    }
  };

  const handleBestBuyClick = useCallback((releaseId: number) => {
    setExpandedItemId(releaseId);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        const el = document.getElementById(`wantlist-item-${releaseId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  }, []);

  return (
    <div className="flex flex-col p-4 lg:flex-row lg:gap-6">
      <aside className="w-full flex-shrink-0 lg:w-72">
        {viewType === "wantlist" && (
          <BestBuysPanel
            items={uniqueWantlistItems as ProcessedWantlistItem[]}
            prices={wantlistPrices ?? {}}
            collectionMasterIds={collectionMasterIds}
            artistCounts={tasteSignals.artistCounts}
            labelCounts={tasteSignals.labelCounts}
            styleCounts={tasteSignals.styleCounts}
            pressingCounts={pressingCounts}
            onItemClick={handleBestBuyClick}
          />
        )}
        <FilterSidebar
          items={items}
          folders={viewType === "collection" ? folders : []}
          activeFilters={activeFilters}
          onFilterChange={onFilterChange}
          onFilterClear={onFilterClear}
          customFields={customFields}
        />
      </aside>
      <div className="mt-6 min-w-0 flex-1 lg:mt-0">
        <SortControls
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortKeyChange={setSortKey}
          onSortOrderChange={handleSortOrderChange}
          view={view}
          onViewChange={setView}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          viewType={viewType}
          filterOptions={
            viewType === "wantlist"
              ? [
                  {
                    isEnabled: showOnlyInCollection,
                    onToggle: () => setShowOnlyInCollection((prev) => !prev),
                    label: "In collection",
                  },
                  {
                    isEnabled: showOnlyFinnHits,
                    onToggle: () => setShowOnlyFinnHits((prev) => !prev),
                    label: "Found on Finn.no",
                  },
                ]
              : undefined
          }
        />
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-discogs-text-secondary">
              Your {viewType} is empty.
            </p>
            <p className="mt-2 text-discogs-text-secondary">
              Try syncing with Discogs to load your data.
            </p>
          </div>
        ) : view === "grid" ? (
          <Grid
            items={sortedAndFilteredItems}
            expandedItemId={viewType === "wantlist" ? expandedItemId : null}
            onToggleExpand={
              viewType === "wantlist"
                ? (id) => setExpandedItemId((prev) => (prev === id ? null : id))
                : undefined
            }
            finnCounts={viewType === "wantlist" ? finnCounts : undefined}
          />
        ) : (
          <AlbumList
            items={sortedAndFilteredItems}
            folders={folders}
            expandedItemId={viewType === "wantlist" ? expandedItemId : null}
            onToggleExpand={
              viewType === "wantlist"
                ? (id) => setExpandedItemId((prev) => (prev === id ? null : id))
                : undefined
            }
            finnCounts={viewType === "wantlist" ? finnCounts : undefined}
          />
        )}
      </div>
    </div>
  );
};

export default AlbumViewer;
