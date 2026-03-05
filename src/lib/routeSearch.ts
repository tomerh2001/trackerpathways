import { DataStructure, PathResult } from "@/types";

export interface RouteSearchResult extends PathResult {
  stepDays: Array<number | null>;
}

interface RouteSearchParams {
  sourceRaw: string;
  targetRaw: string;
  maxJumps: number;
  maxDays: number | null;
  maxPathsLimit?: number;
}

export function searchRoutes(
  data: DataStructure,
  {
    sourceRaw,
    targetRaw,
    maxJumps,
    maxDays,
    maxPathsLimit = 2000,
  }: RouteSearchParams
): RouteSearchResult[] {
  const sQueryRaw = sourceRaw.toLowerCase().trim();
  const sourceInputs = sQueryRaw ? sQueryRaw.split(",").map((value) => value.trim()).filter(Boolean) : [];
  const tQuery = targetRaw.toLowerCase().trim();

  if (!sQueryRaw && !tQuery) {
    return [];
  }

  const getAbbr = (name: string) => {
    if (data.abbrList[name]) {
      return data.abbrList[name];
    }

    const capitals = name.match(/[A-Z]/g);
    if (capitals && capitals.length >= 2) {
      return capitals.join("");
    }

    return name.substring(0, 3).toUpperCase();
  };

  const allTrackerKeys = Object.keys(data.routeInfo);
  const allTrackers = Array.from(
    new Set([
      ...allTrackerKeys,
      ...allTrackerKeys.flatMap((key) => Object.keys(data.routeInfo[key] || {})),
    ])
  );

  const isStrictTarget = allTrackers.some(
    (tracker) => tracker.toLowerCase() === tQuery || getAbbr(tracker).toLowerCase() === tQuery
  );

  let startNodes: string[] = [];
  if (sourceInputs.length > 0) {
    startNodes = allTrackerKeys.filter((tracker) => {
      const trackerName = tracker.toLowerCase();
      const trackerAbbr = getAbbr(tracker).toLowerCase();

      return sourceInputs.some((input) => {
        const isStrictInput = allTrackers.some(
          (validTracker) => validTracker.toLowerCase() === input || getAbbr(validTracker).toLowerCase() === input
        );

        if (isStrictInput) {
          return trackerName === input || trackerAbbr === input;
        }

        return trackerName.includes(input) || trackerAbbr === input;
      });
    });
  } else if (tQuery) {
    startNodes = allTrackerKeys;
  }

  const startNodeSet = new Set(startNodes);
  const results: RouteSearchResult[] = [];
  const queue: RouteSearchResult[] = [];

  startNodes.forEach((startNode) => {
    queue.push({
      source: startNode,
      target: startNode,
      nodes: [startNode],
      totalDays: 0,
      stepDays: [],
      routes: [],
    });
  });

  let pathsFound = 0;

  while (queue.length > 0) {
    if (pathsFound >= maxPathsLimit) {
      break;
    }

    const currentPath = queue.shift();
    if (!currentPath) {
      continue;
    }

    const currentNode = currentPath.nodes[currentPath.nodes.length - 1];
    if (!currentNode) {
      continue;
    }

    if (currentPath.nodes.length > 1) {
      let isTargetMatch = true;
      if (tQuery) {
        const currentName = currentNode.toLowerCase();
        const currentAbbr = getAbbr(currentNode).toLowerCase();
        if (isStrictTarget) {
          isTargetMatch = currentName === tQuery || currentAbbr === tQuery;
        } else {
          isTargetMatch = currentName.includes(tQuery) || currentAbbr.includes(tQuery);
        }
      }

      if (isTargetMatch) {
        if (maxDays === null || (currentPath.totalDays !== null && currentPath.totalDays <= maxDays)) {
          results.push(currentPath);
          pathsFound++;
        }
      }
    }

    if (currentPath.routes.length >= maxJumps) {
      continue;
    }

    const neighbors = data.routeInfo[currentNode];
    if (!neighbors) {
      continue;
    }

    for (const [nextTracker, details] of Object.entries(neighbors)) {
      if (startNodeSet.has(nextTracker) && nextTracker.toLowerCase() !== tQuery) {
        continue;
      }

      if (currentPath.nodes.includes(nextTracker)) {
        continue;
      }

      const edgeDays = details.days;
      const forumReq = data.unlockInviteClass[currentNode];
      const forumDays = forumReq?.[0] ?? 0;
      let stepDays: number | null = null;

      if (edgeDays !== null) {
        stepDays = Math.max(edgeDays, forumDays);
      }

      const nextTotalDays =
        currentPath.totalDays === null || stepDays === null ? null : currentPath.totalDays + stepDays;

      if (maxDays !== null && nextTotalDays !== null && nextTotalDays > maxDays) {
        continue;
      }

      queue.push({
        source: currentPath.source,
        target: nextTracker,
        nodes: [...currentPath.nodes, nextTracker],
        totalDays: nextTotalDays,
        stepDays: [...currentPath.stepDays, stepDays],
        routes: [...currentPath.routes, details],
      });
    }
  }

  return results;
}
