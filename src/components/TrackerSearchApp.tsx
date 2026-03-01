"use client";

import { useState, useMemo, useEffect, useDeferredValue, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import rawData from "@/data/trackers.json"; 
import { DataStructure, PathResult } from "@/types"; 

const data = rawData as unknown as DataStructure;
const PATHS_PAGE_SIZE = 12;

export default function TrackerSearchApp() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sourceSearch, setSourceSearch] = useState(searchParams.get("source") || "");
  const [targetSearch, setTargetSearch] = useState(searchParams.get("target") || "");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>((searchParams.get("view") as 'grid' | 'list') || 'grid');
    
  const [maxJumps, setMaxJumps] = useState<number>(
    searchParams.get("jumps") ? Number.parseInt(searchParams.get("jumps")!, 10) : 1
  );
  const [maxDays, setMaxDays] = useState<number | null>(
    searchParams.get("days") ? Number.parseInt(searchParams.get("days")!, 10) : null
  );
  const [sortBy, setSortBy] = useState<'days' | 'jumps'>((searchParams.get("sort") as 'days' | 'jumps') || 'jumps');

  const [showFilters, setShowFilters] = useState(false);
  const [showCollectionManager, setShowCollectionManager] = useState(false);

  const [showSourceSug, setShowSourceSug] = useState(false);
  const [showTargetSug, setShowTargetSug] = useState(false);
  const [showCollectionSug, setShowCollectionSug] = useState(false);
    
  const [sourceActiveIndex, setSourceActiveIndex] = useState(-1);
  const [targetActiveIndex, setTargetActiveIndex] = useState(-1);
  const [collectionActiveIndex, setCollectionActiveIndex] = useState(-1);

  const sourceWrapperRef = useRef<HTMLDivElement>(null);
  const targetWrapperRef = useRef<HTMLDivElement>(null);
  const collectionWrapperRef = useRef<HTMLDivElement>(null);
    
  const sourceListRef = useRef<HTMLDivElement>(null);
  const targetListRef = useRef<HTMLDivElement>(null);
  const collectionListRef = useRef<HTMLDivElement>(null);

  const deferredSource = useDeferredValue(sourceSearch);
  const deferredTarget = useDeferredValue(targetSearch);
  const isStale = sourceSearch !== deferredSource || targetSearch !== deferredTarget;

  const [mounted, setMounted] = useState(false);

  const [foundPaths, setFoundPaths] = useState<PathResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [myTrackers, setMyTrackers] = useState<string[]>([]);
  const [collectionInput, setCollectionInput] = useState("");

  const isUsingCollection = myTrackers.length > 0 && sourceSearch === myTrackers.join(", ");
  const [visiblePathsCount, setVisiblePathsCount] = useState(PATHS_PAGE_SIZE);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      const savedCollection = localStorage.getItem("tracker-collection") || "";
      const trackers = savedCollection
        .split(",")
        .map((tracker) => tracker.trim())
        .filter(Boolean);

      setMyTrackers(trackers);
    } catch (error) {
      console.error("Failed to read tracker collection", error);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const params = new URLSearchParams();
    if (deferredSource) params.set("source", deferredSource);
    if (deferredTarget) params.set("target", deferredTarget);
    if (viewMode !== 'grid') params.set("view", viewMode);
    if (maxJumps !== 1) params.set("jumps", maxJumps.toString());
    if (maxDays !== null) params.set("days", maxDays.toString());
    if (sortBy !== 'jumps') params.set("sort", sortBy);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [deferredSource, deferredTarget, viewMode, maxJumps, maxDays, sortBy, mounted, pathname, router]);

  useEffect(() => {
    const fetchPaths = async () => {
      if (!deferredSource && !deferredTarget) {
        setFoundPaths([]);
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (deferredSource) params.append("source", deferredSource);
        if (deferredTarget) params.append("target", deferredTarget);
        params.append("jumps", maxJumps.toString());
        if (maxDays) params.append("days", maxDays.toString());

        const res = await fetch(`/api/routes?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setFoundPaths(data);
        }
      } catch (error) {
        console.error("Failed to fetch routes", error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
        fetchPaths();
    }, 300); 

    return () => clearTimeout(timeoutId);

  }, [deferredSource, deferredTarget, maxJumps, maxDays]);

  useEffect(() => {
     if (!searchParams.get("source") && !searchParams.get("target")) {
        setSourceSearch("");
        setTargetSearch("");
        setFoundPaths([]);
        setVisiblePathsCount(PATHS_PAGE_SIZE);
      }
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sourceWrapperRef.current && !sourceWrapperRef.current.contains(event.target as Node)) {
        setShowSourceSug(false);
        setSourceActiveIndex(-1);
      }
      if (targetWrapperRef.current && !targetWrapperRef.current.contains(event.target as Node)) {
        setShowTargetSug(false);
        setTargetActiveIndex(-1);
      }
      if (collectionWrapperRef.current && !collectionWrapperRef.current.contains(event.target as Node)) {
        setShowCollectionSug(false);
        setCollectionActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (sourceActiveIndex >= 0 && sourceListRef.current) {
      const list = sourceListRef.current;
      const activeElement = list.children[sourceActiveIndex] as HTMLElement;
      if (activeElement) {
        if (sourceActiveIndex === 0) {
           list.scrollTop = 0;
        } else if (sourceActiveIndex === list.children.length - 1) {
           list.scrollTop = list.scrollHeight;
        } else {
           activeElement.scrollIntoView({ block: "nearest" });
        }
      }
    }
  }, [sourceActiveIndex]);

  useEffect(() => {
    if (targetActiveIndex >= 0 && targetListRef.current) {
      const list = targetListRef.current;
      const activeElement = list.children[targetActiveIndex] as HTMLElement;
      if (activeElement) {
        if (targetActiveIndex === 0) {
           list.scrollTop = 0;
        } else if (targetActiveIndex === list.children.length - 1) {
           list.scrollTop = list.scrollHeight;
        } else {
           activeElement.scrollIntoView({ block: "nearest" });
        }
      }
    }
  }, [targetActiveIndex]);

  useEffect(() => {
    if (collectionActiveIndex >= 0 && collectionListRef.current) {
      const list = collectionListRef.current;
      const activeElement = list.children[collectionActiveIndex] as HTMLElement;
      if (activeElement) {
        if (collectionActiveIndex === 0) {
           list.scrollTop = 0;
        } else if (collectionActiveIndex === list.children.length - 1) {
           list.scrollTop = list.scrollHeight;
        } else {
           activeElement.scrollIntoView({ block: "nearest" });
        }
      }
    }
  }, [collectionActiveIndex]);

  const getAbbr = (name: string) => {
    if (data.abbrList[name]) return data.abbrList[name];
    const capitals = name.match(/[A-Z]/g);
    if (capitals && capitals.length >= 2) return capitals.join("");
    return name.substring(0, 3).toUpperCase();
  };

  const allTrackers = useMemo(() => {
    const set = new Set<string>();
    Object.keys(data.routeInfo).forEach(key => {
      set.add(key);
      const targets = data.routeInfo[key];
      if (targets) {
        Object.keys(targets).forEach(t => set.add(t));
      }
    });
    return Array.from(set).sort();
  }, []);

  const getSuggestions = (query: string) => {
    if (!query) return [];
    const terms = query.split(",");
    const lastTerm = terms[terms.length - 1].trim().toLowerCase();
    if (!lastTerm) return [];

    return allTrackers.filter(t => {
      const abbr = getAbbr(t).toLowerCase();
      return t.toLowerCase().includes(lastTerm) || abbr.includes(lastTerm);
    }).slice(0, 8);
  };

  const handleSourceSelect = (selectedItem: string) => {
    const terms = sourceSearch.split(",");
    terms.pop(); 
    terms.push(selectedItem); 
    setSourceSearch(terms.join(", ")); 
    setVisiblePathsCount(PATHS_PAGE_SIZE);
    setShowSourceSug(false);
    setSourceActiveIndex(-1);
  };

  const handleTargetSelect = (selectedItem: string) => {
    setTargetSearch(selectedItem);
    setVisiblePathsCount(PATHS_PAGE_SIZE);
    setShowTargetSug(false);
    setTargetActiveIndex(-1);
  };

  const handleCollectionSelect = (selectedItem: string) => {
    if (!myTrackers.includes(selectedItem)) {
      const updated = [...myTrackers, selectedItem];
      setMyTrackers(updated);
      localStorage.setItem("tracker-collection", updated.join(", "));
    }
    setCollectionInput("");
    setShowCollectionSug(false);
    setCollectionActiveIndex(-1);
  };

  const removeCollectionItem = (itemToRemove: string) => {
    const updated = myTrackers.filter((item) => item !== itemToRemove);
    setMyTrackers(updated);
    localStorage.setItem("tracker-collection", updated.join(", "));
  };

  const handleSourceKeyDown = (e: React.KeyboardEvent) => {
    if (!showSourceSug) return;
    const suggestions = getSuggestions(sourceSearch);
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSourceActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSourceActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && sourceActiveIndex >= 0 && suggestions[sourceActiveIndex]) {
      e.preventDefault();
      handleSourceSelect(suggestions[sourceActiveIndex]);
    } else if (e.key === "Escape") {
      setShowSourceSug(false);
    }
  };

  const handleTargetKeyDown = (e: React.KeyboardEvent) => {
    if (!showTargetSug) return;
    const suggestions = getSuggestions(targetSearch);
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setTargetActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setTargetActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && targetActiveIndex >= 0 && suggestions[targetActiveIndex]) {
      e.preventDefault();
      handleTargetSelect(suggestions[targetActiveIndex]);
    } else if (e.key === "Escape") {
      setShowTargetSug(false);
    }
  };

  const handleCollectionKeyDown = (e: React.KeyboardEvent) => {
    if (!showCollectionSug) return;
    const suggestions = getSuggestions(collectionInput);
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCollectionActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCollectionActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && collectionActiveIndex >= 0 && suggestions[collectionActiveIndex]) {
      e.preventDefault();
      handleCollectionSelect(suggestions[collectionActiveIndex]);
    } else if (e.key === "Escape") {
      setShowCollectionSug(false);
    }
  };

  const toggleMyTrackers = () => {
    if (myTrackers.length === 0) return;
    if (isUsingCollection) {
      setSourceSearch("");
    } else {
      setSourceSearch(myTrackers.join(", "));
    }
    setVisiblePathsCount(PATHS_PAGE_SIZE);
    setShowSourceSug(false);
    setSourceActiveIndex(-1);
  };

  const getPathId = (path: PathResult) => `${path.source}>${path.nodes.join(">")}`;

  const getStepDays = (path: PathResult, routeIndex: number) => {
    const stepDayFromApi = path.stepDays?.[routeIndex];
    if (stepDayFromApi !== undefined) {
      return stepDayFromApi;
    }

    const route = path.routes[routeIndex];
    if (!route || route.days === null) {
      return null;
    }

    const sourceNode = path.nodes[routeIndex];
    const unlockDays = data.unlockInviteClass[sourceNode]?.[0] ?? 0;
    return Math.max(route.days, unlockDays);
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'yes' || s === 'open') return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30';
    if (s === 'no' || s === 'closed') return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30';
    return 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30';
  };

  const getStatusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'yes') return 'Recruiting'; 
    if (s === 'no') return 'Closed';
    return status; 
  };

  const renderReqs = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const sortedPaths = useMemo(() => {
    return [...foundPaths].sort((a, b) => {
      const aTotalDays = a.totalDays ?? Number.POSITIVE_INFINITY;
      const bTotalDays = b.totalDays ?? Number.POSITIVE_INFINITY;

      if (sortBy === 'days') {
        if (aTotalDays !== bTotalDays) {
          return aTotalDays - bTotalDays;
        }
        if (a.routes.length !== b.routes.length) {
          return a.routes.length - b.routes.length;
        }
      } else {
        if (a.routes.length !== b.routes.length) {
          return a.routes.length - b.routes.length;
        }
        if (aTotalDays !== bTotalDays) {
          return aTotalDays - bTotalDays;
        }
      }
        
      return a.target.localeCompare(b.target);
    });
  }, [foundPaths, sortBy]);

  const bestPathId = (deferredTarget && sortedPaths.length > 0) ? getPathId(sortedPaths[0]) : null;
  const displayedPaths = useMemo(() => {
    return sortedPaths.slice(0, visiblePathsCount);
  }, [sortedPaths, visiblePathsCount]);

  const groupedResults = useMemo(() => {
    const groups: { [key: string]: PathResult[] } = {};
    displayedPaths.forEach(path => {
      if (!groups[path.source]) groups[path.source] = [];
      groups[path.source].push(path);
    });
    return groups;
  }, [displayedPaths]);


  if (!mounted) return <div className="w-full" />;

  const badgeClass = "flex items-center gap-1.5 text-xs font-semibold text-foreground/80 bg-foreground/10 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap";

  return (
    <>
      <div className={`w-full transition-all duration-500 ease-out ${sourceSearch || targetSearch ? 'translate-y-0' : 'translate-y-4 md:translate-y-16'}`}>
        {!sourceSearch && !targetSearch && (
          <div className="text-center mb-10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
              Discover the private tracker network.
            </h1>
            <p className="text-lg text-foreground/60 font-medium mx-auto leading-relaxed">
              Find your way to the trackers worth chasing. Explore detailed pathways, requirements, and invite tiers.
            </p>
          </div>
        )}

        <div className="w-full max-w-2xl mx-auto bg-foreground/3 border border-foreground/10 rounded-xl p-2 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col relative">
              
            <div className="absolute left-4 top-4 bottom-14 flex flex-col items-center gap-1 z-0 pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full border-[3px] border-foreground/10 bg-background"></div>
              <div className="w-px flex-1 bg-linear-to-b from-foreground/10 to-foreground/10"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-foreground/10"></div>
            </div>

            <div className="flex flex-col gap-1 pl-9 pr-2 py-2">
              
              <div className="relative" ref={sourceWrapperRef}>
                <div className="relative flex items-center w-full">
                  <input 
                    aria-label="Source tracker"
                    type="text"
                    disabled={isUsingCollection}
                    placeholder={isUsingCollection ? "Using My Trackers" : "Source tracker(s) (e.g. MAM, RED)"}
                    className={`w-full h-10 bg-transparent border-none outline-none font-medium text-sm pr-10 sm:pr-[150px] ${
                      isUsingCollection ? "text-foreground/50 cursor-not-allowed" : "text-foreground placeholder:text-foreground/30"
                    }`}
                    value={sourceSearch}
                    onFocus={() => {
                      if (!isUsingCollection) setShowSourceSug(true);
                    }}
                    onChange={(e) => {
                      if (isUsingCollection) return;
                      setSourceSearch(e.target.value);
                      setVisiblePathsCount(PATHS_PAGE_SIZE);
                      setShowSourceSug(true);
                      setSourceActiveIndex(-1);
                    }}
                    onKeyDown={handleSourceKeyDown}
                  />
                  <div className="absolute right-0 flex items-center pr-1">
                    <button
                      onClick={toggleMyTrackers}
                      disabled={myTrackers.length === 0}
                      className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors border ${
                        myTrackers.length === 0
                          ? "text-foreground/30 cursor-not-allowed bg-transparent border-transparent"
                          : isUsingCollection
                            ? "bg-green-500/15 text-green-600 dark:text-green-300 border-green-500/40"
                            : "text-foreground/70 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground border-transparent"
                      }`}
                    >
                      <span className="material-symbols-rounded text-[14px]">bookmarks</span>
                      <span className="hidden sm:inline">Use My Trackers</span>
                    </button>
                  </div>
                </div>
                {!isUsingCollection && showSourceSug && getSuggestions(sourceSearch).length > 0 && (
                  <div className="absolute top-full -left-8 w-[calc(100%+2rem)] mt-2 bg-card rounded-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 border border-foreground/10">
                    <div className="max-h-60 overflow-y-auto p-1" ref={sourceListRef}>
                      {getSuggestions(sourceSearch).map((item, i) => (
                        <div 
                          key={i}
                          className={`px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors text-foreground/90 font-medium flex items-center justify-between ${
                            i === sourceActiveIndex 
                              ? 'bg-foreground/10' 
                              : 'hover:bg-foreground/5'
                          }`}
                          onClick={() => handleSourceSelect(item)}
                        >
                          <span>{item}</span>
                          <span className="text-xs text-foreground/40 font-semibold">{getAbbr(item)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px w-full bg-foreground/5 my-1"></div>

              <div className="relative" ref={targetWrapperRef}>
                <input 
                  aria-label="Target tracker"
                  type="text"
                  placeholder="Target tracker(s)"
                  className="w-full h-10 bg-transparent border-none outline-none font-medium text-foreground placeholder:text-foreground/30 text-sm"
                  value={targetSearch}
                  onFocus={() => setShowTargetSug(true)}
                  onChange={(e) => {
                    setTargetSearch(e.target.value);
                    setVisiblePathsCount(PATHS_PAGE_SIZE);
                    setShowTargetSug(true);
                    setTargetActiveIndex(-1);
                  }}
                  onKeyDown={handleTargetKeyDown}
                />
                {showTargetSug && getSuggestions(targetSearch).length > 0 && (
                  <div className="absolute top-full -left-8 w-[calc(100%+2rem)] mt-2 bg-card rounded-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 border border-foreground/10">
                    <div className="max-h-60 overflow-y-auto p-1" ref={targetListRef}>
                      {getSuggestions(targetSearch).map((item, i) => (
                        <div 
                          key={i}
                          className={`px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors text-foreground/90 font-medium flex items-center justify-between ${
                            i === targetActiveIndex 
                              ? 'bg-foreground/10' 
                              : 'hover:bg-foreground/5'
                          }`}
                          onClick={() => handleTargetSelect(item)}
                        >
                          <span>{item}</span>
                          <span className="text-xs text-foreground/40 font-semibold">{getAbbr(item)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="flex items-center justify-between mt-1 pt-1 px-2 pb-1">
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowFilters(!showFilters);
                    if (showCollectionManager) setShowCollectionManager(false);
                  }}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all text-sm font-medium bg-foreground/5 ${
                    showFilters 
                      ? 'text-foreground' 
                      : 'text-foreground/50 hover:text-foreground' 
                  }`}
                >
                  <span className="material-symbols-rounded text-lg">tune</span>
                  <span>Options</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowCollectionManager(!showCollectionManager);
                    if (showFilters) setShowFilters(false);
                  }}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all text-sm font-medium bg-foreground/5 ${
                    showCollectionManager 
                      ? 'text-foreground' 
                      : 'text-foreground/50 hover:text-foreground' 
                  }`}
                >
                  <span className="material-symbols-rounded text-lg">collections_bookmark</span>
                  <span className="hidden sm:inline">My Trackers</span>
                </button>
              </div>

              <div className="hidden md:flex items-center bg-foreground/5 rounded-md p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-sm flex items-center justify-center transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-foreground/10 text-foreground' 
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  <span className="material-symbols-rounded text-lg">grid_view</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-sm flex items-center justify-center transition-all ${
                    viewMode === 'list' 
                      ? 'bg-foreground/10 text-foreground' 
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  <span className="material-symbols-rounded text-lg">view_list</span>
                </button>
              </div>

            </div>

          </div>
        </div>

        {showFilters && (
          <div className="max-w-2xl mx-auto mt-2 p-6 bg-foreground/3 border border-foreground/10 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div>
                <label className="text-sm font-medium text-foreground/50 mb-2 block">Max jumps</label>
                <div className="flex rounded-lg bg-foreground/5 p-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        setMaxJumps(val);
                        setVisiblePathsCount(PATHS_PAGE_SIZE);
                      }}
                      className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-all ring-0 focus:ring-0 font-medium ${
                        maxJumps === val 
                          ? 'bg-foreground/10 text-foreground' 
                          : 'text-foreground/60 hover:text-foreground'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground/50 mb-2 block">Max days</label>
                <div className="flex rounded-lg bg-foreground/5 p-1">
                  {[
                    { l: 'Any', v: null },
                    { l: '90d', v: 90 },
                    { l: '6m', v: 180 },
                    { l: '1y', v: 365 },
                    { l: '2y', v: 730 }
                  ].map((opt) => (
                    <button
                      key={opt.l}
                      onClick={() => {
                        setMaxDays(opt.v);
                        setVisiblePathsCount(PATHS_PAGE_SIZE);
                      }}
                      className={`flex-1 px-2 py-1.5 text-sm rounded-md whitespace-nowrap transition-all ring-0 focus:ring-0 font-medium ${
                        maxDays === opt.v 
                          ? 'bg-foreground/10 text-foreground' 
                          : 'text-foreground/60 hover:text-foreground'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground/50 mb-2 block">Sort by</label>
                <div className="flex rounded-lg bg-foreground/5 p-1">
                  {[
                    { l: 'Jumps', v: 'jumps' },
                    { l: 'Days', v: 'days' }
                  ].map((opt) => (
                    <button
                      key={opt.l}
                      onClick={() => {
                        setSortBy(opt.v as 'days' | 'jumps');
                        setVisiblePathsCount(PATHS_PAGE_SIZE);
                      }}
                      className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-all ring-0 focus:ring-0 font-medium ${
                        sortBy === opt.v 
                          ? 'bg-foreground/10 text-foreground' 
                          : 'text-foreground/60 hover:text-foreground'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {showCollectionManager && (
          <div className="max-w-2xl mx-auto mt-2 p-6 bg-foreground/3 border border-foreground/10 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-4">
              <div className="relative" ref={collectionWrapperRef}>
                <label className="text-sm font-medium text-foreground/50 mb-2 block">Add to My Trackers</label>
                <input 
                  type="text"
                  placeholder="Search tracker to add..."
                  className="w-full h-10 bg-foreground/5 border border-foreground/10 rounded-md text-sm p-2.5 outline-none focus:border-purple-500/50 transition-colors"
                  value={collectionInput}
                  onFocus={() => setShowCollectionSug(true)}
                  onChange={(e) => {
                    setCollectionInput(e.target.value);
                    setShowCollectionSug(true);
                    setCollectionActiveIndex(-1);
                  }}
                  onKeyDown={handleCollectionKeyDown}
                />
                {showCollectionSug && getSuggestions(collectionInput).length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-card rounded-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 border border-foreground/10">
                    <div className="max-h-60 overflow-y-auto p-1" ref={collectionListRef}>
                      {getSuggestions(collectionInput).map((item, i) => (
                        <div 
                          key={i}
                          className={`px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors text-foreground/90 font-medium flex items-center justify-between ${
                            i === collectionActiveIndex 
                              ? 'bg-foreground/10' 
                              : 'hover:bg-foreground/5'
                          }`}
                          onClick={() => handleCollectionSelect(item)}
                        >
                          <span>{item}</span>
                          <span className="text-xs text-foreground/40 font-semibold">{getAbbr(item)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {myTrackers.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {myTrackers.map(t => (
                    <button
                      key={t}
                      onClick={() => removeCollectionItem(t)}
                      className="px-2.5 py-1 rounded-md text-sm font-medium bg-purple-500/10 hover:bg-red-500/10 text-purple-600 dark:text-purple-400 hover:text-red-600 dark:hover:text-red-400 border border-purple-500/20 hover:border-red-500/20 transition-colors cursor-pointer"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-foreground/40 mt-1">
                  Your collection is empty. Add trackers you are already in to easily use them as a source.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {(sourceSearch || targetSearch) && (
        <div className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="flex items-center gap-3 mb-5 px-1">
            <h2 className="text-sm font-medium text-foreground/50">
              Search results
            </h2>
            {isLoading || isStale ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-foreground/5 rounded-md">
                <span className="material-symbols-rounded text-lg text-foreground/50 animate-spin">progress_activity</span>
              </div>
            ) : (
              <span className={badgeClass}>{foundPaths.length} Found</span>
            )}
          </div>

          <div className="flex flex-col gap-10 pb-10">
            {Object.keys(groupedResults).sort().map((sourceName) => {
              const paths = groupedResults[sourceName];
              const sourceAbbr = getAbbr(sourceName);
              const unlockInfo = data.unlockInviteClass[sourceName];

              return (
                <div key={sourceName} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  <div className="flex flex-col gap-2 px-1 pb-2 mb-1">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground tracking-tight mr-1">{sourceName}</h3>
                        
                        {sourceAbbr && (
                          <span className={badgeClass}>
                            {sourceAbbr}
                          </span>
                        )}
                      </div>

                      {unlockInfo && (
                        <div className="flex items-start gap-1.5 text-sm text-foreground/70 bg-foreground/5 px-2.5 py-1.5 rounded-md self-start w-fit max-w-full md:max-w-md">
                          <span className="material-symbols-rounded text-sm shrink-0 mt-0.5">lock_open</span>
                          <span className="leading-tight wrap-break-word">
                             {unlockInfo[1]} {unlockInfo[0] !== null ? `(${unlockInfo[0]}d)` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={
                    viewMode === 'grid' 
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "grid grid-cols-1 gap-3"
                  }>
                    {paths.map((path) => {
                      const targetAbbr = getAbbr(path.target);
                      const isDirect = path.routes.length === 1;
                      const pathId = getPathId(path);
                      const isBestPath = pathId === bestPathId;

                      return (
                        <div
                          key={pathId}
                          className={`flex flex-col p-5 rounded-xl border transition-colors duration-200 h-full ${
                            isBestPath
                              ? "border-green-500/40 bg-green-500/5"
                              : "bg-card border-foreground/10"
                          }`}
                        >
                          
                          <div className="flex justify-between items-start mb-3 gap-4"> 
                            <div className="min-w-0">
                              
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                                <div className="font-bold text-foreground text-lg wrap-break-word">{path.target}</div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  {isBestPath && (
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md">
                                      <span className="material-symbols-rounded text-sm">workspace_premium</span>
                                      {sortBy === 'days' ? "Fastest route" : "Fewest hops"}
                                    </span>
                                  )}
                                  <span className={badgeClass}>
                                    {targetAbbr}
                                  </span>

                                  {!isDirect && <span className={badgeClass}>{path.routes.length} hop</span>}
                                </div>
                              </div>
                              
                              <div className="text-sm font-medium text-foreground/50 tracking-wide flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                <span>From</span>
                                <span className="text-foreground/80 font-medium">{sourceName}</span>
                                <span className={badgeClass}>
                                  {sourceAbbr}
                                </span>
                              </div>
                              
                            </div>
                            
                            <span className={`text-sm font-medium bg-transparent border border-foreground/10 px-2 py-1 rounded-md whitespace-nowrap shrink-0 ${path.totalDays === null ? 'text-foreground/40' : 'text-foreground/70'}`}>
                              {path.totalDays === null ? 'Unknown' : `${path.totalDays} days`}
                            </span>
                          </div>
                          
                          <div className="space-y-3 mt-auto flex-1">
                            {path.routes.map((req, rIdx) => {
                              const fromNode = path.nodes[rIdx];
                              const toNode = path.nodes[rIdx + 1];
                              const stepDays = getStepDays(path, rIdx);
                              
                              return (
                                <div key={rIdx} className="text-sm pl-3 relative border-l-2 border-foreground/10">
                                  {!isDirect && (
                                    <div className="text-sm font-semibold text-foreground/40 mb-1 flex items-center gap-1">
                                      <span>{fromNode}</span><span className="material-symbols-rounded text-base">arrow_right_alt</span><span>{toNode}</span>
                                    </div>
                                  )}
                                  <div className={`text-xs font-medium mb-1 ${stepDays === null ? "text-foreground/40" : "text-foreground/60"}`}>
                                    Step time: {stepDays === null ? "Unknown" : `${stepDays} days`}
                                  </div>
                                  <p className="text-foreground/70 leading-relaxed font-normal text-sm">{renderReqs(req.reqs)}</p>
                                  
                                  <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-foreground/5 border-dashed">
                                    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                                      <span className={`text-sm font-semibold px-2 py-0.5 rounded-md ${getStatusColor(req.active)}`}>
                                        {getStatusLabel(req.active)}
                                      </span>
                                      <div className="flex items-center gap-1 text-foreground/30">
                                        <span className="text-xs font-medium">Last checked: {req.updated}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}

            {!isStale && !isLoading && sortedPaths.length > visiblePathsCount && (
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setVisiblePathsCount(current => current + PATHS_PAGE_SIZE)}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-foreground/10 text-foreground/80 hover:bg-foreground/15 transition-colors"
                >
                  Load more ({Math.min(PATHS_PAGE_SIZE, sortedPaths.length - visiblePathsCount)} more)
                </button>
              </div>
            )}
            
            {!isStale && !isLoading && foundPaths.length === 0 && (sourceSearch || targetSearch) && (
              <div className="flex flex-col items-center justify-center py-20 opacity-50 border-2 border-dashed border-foreground/10 rounded-lg">
                <span className="material-symbols-rounded text-6xl mb-4 text-foreground/20">search_off</span>
                <p className="text-foreground/50 font-medium">
                  No routes found matching your criteria
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
