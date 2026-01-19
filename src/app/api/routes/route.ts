import { NextResponse } from "next/server";
import rawData from "@/data/trackers.json";
import { DataStructure, PathResult } from "@/types";

const data = rawData as unknown as DataStructure;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceRaw = searchParams.get("source") || "";
  const targetRaw = searchParams.get("target") || "";
  const maxJumps = parseInt(searchParams.get("jumps") || "1");
  const maxDaysStr = searchParams.get("days");
  const maxDays = maxDaysStr ? parseInt(maxDaysStr) : null;

  const sQueryRaw = sourceRaw.toLowerCase().trim();
  const sourceInputs = sQueryRaw ? sQueryRaw.split(',').map(s => s.trim()).filter(s => s) : [];
  const tQuery = targetRaw.toLowerCase().trim();

  if (!sQueryRaw && !tQuery) {
    return NextResponse.json([]);
  }

  const getAbbr = (name: string) => {
    if (data.abbrList[name]) return data.abbrList[name];
    const capitals = name.match(/[A-Z]/g);
    if (capitals && capitals.length >= 2) return capitals.join("");
    return name.substring(0, 3).toUpperCase();
  };

  const allTrackerKeys = Object.keys(data.routeInfo);
  const allTrackers = Array.from(new Set([
    ...allTrackerKeys,
    ...allTrackerKeys.flatMap(k => Object.keys(data.routeInfo[k] || {}))
  ]));

  const isStrictTarget = allTrackers.some(t => 
    t.toLowerCase() === tQuery || getAbbr(t).toLowerCase() === tQuery
  );

  let startNodes: string[] = [];

  if (sourceInputs.length > 0) {
    startNodes = allTrackerKeys.filter(t => {
      const tLower = t.toLowerCase();
      const tAbbr = getAbbr(t).toLowerCase();
      return sourceInputs.some(input => {
        const isStrictInput = allTrackers.some(validT => validT.toLowerCase() === input || getAbbr(validT).toLowerCase() === input);
        if (isStrictInput) {
          return tLower === input || tAbbr === input;
        }
        return tLower.includes(input) || tAbbr === input;
      });
    });
  } else if (tQuery) {
    startNodes = allTrackerKeys;
  }

  const startNodeSet = new Set(startNodes);
  const results: any[] = [];
  const queue: any[] = [];

  startNodes.forEach(start => {
    queue.push({
      source: start,
      target: start,
      nodes: [start],
      totalDays: 0,
      routes: []
    });
  });

  const MAX_PATHS_LIMIT = 2000; 
  let pathsFound = 0;

  while (queue.length > 0) {
    if (pathsFound >= MAX_PATHS_LIMIT) break;

    const currentPath = queue.shift()!;
    const currentNode = currentPath.nodes[currentPath.nodes.length - 1];

    if (currentPath.nodes.length > 1) {
      let isTargetMatch = true;
      if (tQuery) {
        const cName = currentNode.toLowerCase();
        const cAbbr = getAbbr(currentNode).toLowerCase();
        if (isStrictTarget) {
          isTargetMatch = cName === tQuery || cAbbr === tQuery;
        } else {
          isTargetMatch = cName.includes(tQuery) || cAbbr.includes(tQuery);
        }
      }

      if (isTargetMatch) {
        if (maxDays === null || (currentPath.totalDays !== null && currentPath.totalDays <= maxDays)) {
          results.push(currentPath);
          pathsFound++;
        }
      }
    }

    if (currentPath.routes.length >= maxJumps) continue;

    const neighbors = data.routeInfo[currentNode];
    if (neighbors) {
      for (const [nextTracker, details] of Object.entries(neighbors)) {
        if (startNodeSet.has(nextTracker) && nextTracker.toLowerCase() !== tQuery) {
          continue;
        }

        if (!currentPath.nodes.includes(nextTracker)) {
          const edgeDays = details.days;
          const forumReq = data.unlockInviteClass[currentNode];
          const forumDays = forumReq ? forumReq[0] : 0;
          let stepDays: number | null = null;
          
          if (edgeDays !== null) {
            stepDays = Math.max(edgeDays, forumDays || 0);
          }

          const nextTotalDays = (currentPath.totalDays === null || stepDays === null) ? null : currentPath.totalDays + stepDays;

          if (maxDays !== null && nextTotalDays !== null && nextTotalDays > maxDays) continue;

          queue.push({
            source: currentPath.source,
            target: nextTracker,
            nodes: [...currentPath.nodes, nextTracker],
            totalDays: nextTotalDays,
            routes: [...currentPath.routes, details]
          });
        }
      }
    }
  }

  return NextResponse.json(results);
}