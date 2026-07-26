import { fmt } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Networks (SACE General Mathematics — Matrices and Networks / Discrete
 * Models): shortest path and minimum spanning tree over a weighted graph.
 *
 * Edges are typed as "A-B 5, B-C 3, A-C 9".
 */
interface Edge {
  from: string;
  to: string;
  w: number;
}

function parseEdges(input: string): Edge[] {
  const edges: Edge[] = [];
  const re = /([A-Za-z]\w*)\s*(?:-|–|to|→)\s*([A-Za-z]\w*)\s*[:=\s]\s*(-?\d+(?:\.\d+)?)/g;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(input)) && guard++ < 500) {
    if (m[0].length === 0) break;
    edges.push({ from: m[1], to: m[2], w: Number(m[3]) });
  }
  return edges;
}

function nodesOf(edges: Edge[]): string[] {
  const set = new Set<string>();
  for (const e of edges) {
    set.add(e.from);
    set.add(e.to);
  }
  return [...set].sort();
}

/** Dijkstra, recording the order vertices are finalised for the working. */
function shortestPath(edges: Edge[], start: string, end: string) {
  const nodes = nodesOf(edges);
  const dist = new Map<string, number>(nodes.map((n) => [n, Infinity]));
  const prev = new Map<string, string | null>(nodes.map((n) => [n, null]));
  const done = new Set<string>();
  const order: Array<{ node: string; d: number }> = [];
  dist.set(start, 0);

  while (done.size < nodes.length) {
    let best: string | null = null;
    for (const n of nodes) {
      if (done.has(n)) continue;
      if (best === null || (dist.get(n) ?? Infinity) < (dist.get(best) ?? Infinity)) best = n;
    }
    if (best === null || (dist.get(best) ?? Infinity) === Infinity) break;
    done.add(best);
    order.push({ node: best, d: dist.get(best)! });
    for (const e of edges) {
      for (const [a, b] of [
        [e.from, e.to],
        [e.to, e.from],
      ] as const) {
        if (a !== best || done.has(b)) continue;
        const nd = dist.get(best)! + e.w;
        if (nd < (dist.get(b) ?? Infinity)) {
          dist.set(b, nd);
          prev.set(b, best);
        }
      }
    }
  }

  const path: string[] = [];
  let cur: string | null = end;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  return { dist, order, path: path[0] === start ? path : [], total: dist.get(end) ?? Infinity };
}

/** Kruskal — sort edges, add any that doesn't close a cycle. */
function minimumSpanningTree(edges: Edge[]) {
  const sorted = [...edges].sort((a, b) => a.w - b.w);
  const parent = new Map<string, string>(nodesOf(edges).map((n) => [n, n]));
  const find = (x: string): string => {
    while (parent.get(x) !== x) x = parent.get(x)!;
    return x;
  };
  const chosen: Edge[] = [];
  const rejected: Edge[] = [];
  for (const e of sorted) {
    const ra = find(e.from);
    const rb = find(e.to);
    if (ra === rb) {
      rejected.push(e);
      continue;
    }
    parent.set(ra, rb);
    chosen.push(e);
  }
  return { sorted, chosen, rejected, total: chosen.reduce((s, e) => s + e.w, 0) };
}

const edgeLatex = (e: Edge) => `${e.from}\\text{–}${e.to}\\;(${fmt(e.w)})`;

export const networksSolver: Solver = {
  id: 'networks',
  title: 'Networks',
  subjects: ['General'],
  blurb: 'Shortest path and minimum spanning tree in a weighted network.',
  placeholder: 'e.g.  A-B 5, B-C 3, A-C 9  shortest path A to C',
  methods: [
    { id: 'shortest-path', name: 'Shortest path', blurb: 'Dijkstra’s algorithm — the cheapest route between two nodes.' },
    { id: 'mst', name: 'Minimum spanning tree', blurb: 'Kruskal’s algorithm — connect every node for the least total weight.' },
  ],
  defaultMethodId: 'shortest-path',
  detect(input) {
    const edges = parseEdges(input);
    if (edges.length < 2) return 0;
    const explicit = /network|graph|shortest\s*path|spanning\s*tree|\bmst\b|dijkstra|kruskal|prim/i.test(input);
    return explicit ? 0.96 : 0.8;
  },
  solve(input, methodId): SolveResult {
    const edges = parseEdges(input);
    if (edges.length < 2) {
      return { ok: false, error: 'Type the connections like  A-B 5, B-C 3, A-C 9.' };
    }
    if (edges.some((e) => e.w < 0)) {
      return { ok: false, error: 'These methods need non-negative weights (distances or costs).' };
    }
    const nodes = nodesOf(edges);
    const wantMst = /spanning|\bmst\b|kruskal|prim/i.test(input) || (methodId === 'mst' && !/shortest/i.test(input));

    if (wantMst) {
      const { sorted, chosen, rejected, total } = minimumSpanningTree(edges);
      const steps: Step[] = [
        { note: `The network has ${nodes.length} nodes, so a spanning tree needs ${nodes.length - 1} edges.`, latex: `\\text{nodes: } ${nodes.join(', ')}` },
        { note: 'Sort every edge by weight, smallest first.', latex: sorted.map(edgeLatex).join(', \\; ') },
        {
          note: 'Work down the list, taking each edge unless it would close a cycle.',
          latex: chosen.map(edgeLatex).join(', \\; '),
          annotation: `${chosen.length} edges chosen`,
        },
      ];
      if (rejected.length > 0) {
        steps.push({
          note: 'These were skipped because both ends were already connected.',
          latex: rejected.map(edgeLatex).join(', \\; '),
          annotation: 'would form a cycle',
        });
      }
      steps.push({
        note: 'Add the weights of the chosen edges.',
        latex: `${chosen.map((e) => fmt(e.w)).join(' + ')} = ${fmt(total)}`,
        annotation: 'minimum total',
      });
      const connected = chosen.length === nodes.length - 1;
      if (!connected) {
        steps.push({
          note: 'Not every node could be reached — the network is in separate pieces.',
          latex: `\\text{no spanning tree exists}`,
        });
      }
      return {
        ok: true,
        solution: {
          headline: 'Find the minimum spanning tree',
          methodName: 'Kruskal’s algorithm',
          steps,
          answerLatex: connected ? `\\text{total} = ${fmt(total)}` : undefined,
        },
      };
    }

    // Shortest path — read the endpoints, or default to first and last node.
    const m = input.match(/(?:from\s*)?([A-Za-z]\w*)\s*(?:to|→|-->)\s*([A-Za-z]\w*)\s*$/i);
    const start = m && nodes.includes(m[1]) ? m[1] : nodes[0];
    const end = m && nodes.includes(m[2]) ? m[2] : nodes[nodes.length - 1];
    if (start === end) return { ok: false, error: 'Choose two different nodes, e.g.  shortest path A to C.' };

    const { order, path, total } = shortestPath(edges, start, end);
    if (!Number.isFinite(total) || path.length === 0) {
      return { ok: false, error: `There is no route from ${start} to ${end} in this network.` };
    }

    const steps: Step[] = [
      { note: `Start at ${start} with a distance of 0, and every other node at infinity.`, latex: `d(${start}) = 0` },
      {
        note: 'Repeatedly settle the nearest unvisited node, updating its neighbours.',
        latex: order.map((o) => `d(${o.node}) = ${fmt(o.d)}`).join(', \\; '),
        annotation: 'in the order they were settled',
      },
      {
        note: `Trace the route back from ${end} to read off the path.`,
        latex: path.join(' \\to '),
        annotation: 'shortest route',
      },
      {
        note: 'The total is the settled distance at the destination.',
        latex: `\\text{length} = ${fmt(total)}`,
        annotation: 'minimum distance',
      },
    ];
    return {
      ok: true,
      solution: {
        headline: `Shortest path from $${start}$ to $${end}$`,
        methodName: 'Dijkstra’s algorithm',
        steps,
        answerLatex: `${path.join(' \\to ')} \\;=\\; ${fmt(total)}`,
      },
    };
  },
};
