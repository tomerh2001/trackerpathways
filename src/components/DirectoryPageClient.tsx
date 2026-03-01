"use client";

import { useState, useMemo } from "react";
import rawData from "@/data/trackers.json";

const TRACKERS_PAGE_SIZE = 40;

export default function DirectoryPageClient() {
  const [search, setSearch] = useState("");
  const [visibleTrackersCount, setVisibleTrackersCount] = useState(TRACKERS_PAGE_SIZE);

  const trackers = useMemo(() => {
    if (!rawData.abbrList) return [];
    
    const list = Object.entries(rawData.abbrList).map(([name, abbr]) => ({
      name,
      abbr
    }));

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredTrackers = useMemo(() => {
    if (!search) return trackers;
    const lowerSearch = search.toLowerCase();
    return trackers.filter(t => 
      t.name.toLowerCase().includes(lowerSearch) || 
      t.abbr.toLowerCase().includes(lowerSearch)
    );
  }, [search, trackers]);

  const displayedTrackers = useMemo(() => {
    return filteredTrackers.slice(0, visibleTrackersCount);
  }, [filteredTrackers, visibleTrackersCount]);

  return (
    <main className="w-full px-6 pt-24 md:pt-32 pb-10 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 text-foreground">Tracker Directory</h1>
          <p className="text-sm text-foreground/60">
            Browse all {trackers.length} trackers and abbreviations.
          </p>
        </div>

        <div className="relative w-full md:w-80 shrink-0">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30 flex items-center">
            <span className="material-symbols-rounded">search</span>
          </span>
          <input
            type="text"
            placeholder="Search directory..."
            className="w-full bg-foreground/3 border border-foreground/10 rounded-xl py-2.5 pl-11 pr-4 outline-none focus:outline-none focus:ring-2 focus:ring-foreground/10 font-medium text-foreground placeholder:text-foreground/30 text-sm transition-all"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleTrackersCount(TRACKERS_PAGE_SIZE);
            }}
          />
        </div>
      </div>

      {filteredTrackers.length > 0 ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedTrackers.map((t) => (
              <div 
                key={t.name} 
                className="bg-card border border-foreground/10 rounded-xl p-4 flex items-center justify-between"
              >
                <span className="text-sm font-medium truncate text-foreground/80 pr-3" title={t.name}>
                  {t.name}
                </span>
                <span className="shrink-0 px-2 py-0.5 text-xs font-semibold rounded-md bg-foreground/10 text-foreground/80">
                  {t.abbr}
                </span>
              </div>
            ))}
          </div>

          {filteredTrackers.length > visibleTrackersCount && (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setVisibleTrackersCount(current => current + TRACKERS_PAGE_SIZE)}
                className="px-4 py-2 text-sm font-medium rounded-md bg-foreground/10 text-foreground/80 hover:bg-foreground/15 transition-colors"
              >
                Load more ({Math.min(TRACKERS_PAGE_SIZE, filteredTrackers.length - visibleTrackersCount)} more)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-50 border-2 border-dashed border-foreground/10 rounded-xl">
          <span className="material-symbols-rounded text-6xl mb-4 text-foreground/20">search_off</span>
          <p className="text-foreground/50 font-medium">
            No trackers found matching {search}
          </p>
        </div>
      )}
    </main>
  );
}
