import { normalizeMapKey } from "../path-utils.js";
import type { ModuleGraph } from "./workspace-modules.js";
import {
	findModuleForPath,
	getDownstreamModules,
	getModuleSourceFiles,
} from "./workspace-modules.js";
import type {
	ImpactCascadeResult,
	ReviewGraph,
	ReviewGraphEdge,
} from "./types.js";

function dedupe(items: Iterable<string>): string[] {
	return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

function filePathFromNode(
	graph: ReviewGraph,
	nodeId: string,
): string | undefined {
	return graph.nodes.get(nodeId)?.filePath;
}

function collectIncomingEdges(
	graph: ReviewGraph,
	nodeIds: string[],
	kind: ReviewGraphEdge["kind"],
): ReviewGraphEdge[] {
	const edges: ReviewGraphEdge[] = [];
	for (const nodeId of nodeIds) {
		for (const edge of graph.edgesByTo.get(nodeId) ?? []) {
			if (edge.kind === kind) edges.push(edge);
		}
	}
	return edges;
}

export function computeImpactCascade(
	graph: ReviewGraph,
	changedFile: string,
	moduleGraph?: ModuleGraph | null,
): ImpactCascadeResult {
	const normalizedFile = normalizeMapKey(changedFile);
	const fileNodeId = graph.fileNodes.get(normalizedFile);
	if (!fileNodeId) {
		return {
			filePath: normalizedFile,
			changedSymbols: [],
			directImporters: [],
			directCallers: [],
			neighborFiles: [],
			riskFlags: [],
		};
	}

	const changedSymbols = graph.changedSymbolsByFile.get(normalizedFile) ?? [];
	const symbolNodeIds = (
		graph.symbolNodesByFile.get(normalizedFile) ?? []
	).filter((nodeId) => {
		const symbolName = graph.nodes.get(nodeId)?.symbolName;
		return (
			!changedSymbols.length ||
			(symbolName && changedSymbols.includes(symbolName))
		);
	});
	const effectiveSymbolNodeIds =
		symbolNodeIds.length > 0
			? symbolNodeIds
			: (graph.symbolNodesByFile.get(normalizedFile) ?? []);

	const importerFiles = dedupe(
		(graph.edgesByTo.get(fileNodeId) ?? [])
			.filter((edge) => edge.kind === "imports")
			.flatMap((edge) => filePathFromNode(graph, edge.from) ?? []),
	);

	let callerFiles = dedupe(
		collectIncomingEdges(graph, effectiveSymbolNodeIds, "calls").flatMap(
			(edge) => filePathFromNode(graph, edge.from) ?? [],
		),
	);
	if (
		callerFiles.length === 0 &&
		changedSymbols.length > 0 &&
		importerFiles.length > 0
	) {
		callerFiles = importerFiles;
	}

	// For non-jsts languages, import/call edges are absent but resolved
	// `references` edges exist. Include them as supplemental neighbors.
	const referenceFiles = dedupe(
		collectIncomingEdges(graph, effectiveSymbolNodeIds, "references").flatMap(
			(edge) => filePathFromNode(graph, edge.from) ?? [],
		),
	);

	let neighborFiles = dedupe([
		...importerFiles,
		...callerFiles,
		...referenceFiles,
	]).filter((candidate) => normalizeMapKey(candidate) !== normalizedFile);

	// Module-level downstream expansion for monorepos
	const downstreamModuleFiles: string[] = [];
	if (moduleGraph) {
		const changedModule = findModuleForPath(moduleGraph, normalizedFile);
		if (changedModule) {
			const downstream = getDownstreamModules(moduleGraph, changedModule.name);
			for (const depName of downstream) {
				const depMod = moduleGraph.modules.get(depName);
				if (depMod) {
					// Add representative source files from downstream modules
					downstreamModuleFiles.push(...getModuleSourceFiles(depMod.root));
				}
			}
		}
	}
	if (downstreamModuleFiles.length > 0) {
		neighborFiles = dedupe([...neighborFiles, ...downstreamModuleFiles]);
	}
	const directImports = dedupe(
		(graph.edgesByFrom.get(fileNodeId) ?? [])
			.filter((edge) => edge.kind === "imports")
			.flatMap((edge) => filePathFromNode(graph, edge.to) ?? []),
	);

	const riskFlags = new Set<string>();
	for (const nodeId of effectiveSymbolNodeIds) {
		const node = graph.nodes.get(nodeId);
		if (!node) continue;
		if (node.exported) riskFlags.add("exported symbol changed");
		const fanout = (graph.edgesByFrom.get(nodeId) ?? []).filter(
			(edge) => edge.kind === "calls",
		).length;
		if (fanout >= 4) riskFlags.add("high fanout");
		const complexity = Number(node.metadata?.cyclomaticComplexity ?? 0);
		if (complexity >= 8) riskFlags.add("high complexity");
		if (node.metadata?.isBoundaryWrapper)
			riskFlags.add("boundary wrapper changed");
	}
	if (importerFiles.some((file) => directImports.includes(file))) {
		riskFlags.add("cycle-adjacent file");
	}

	const riskFlagList = dedupe(riskFlags);
	if (downstreamModuleFiles.length > 0) {
		riskFlagList.push(
			`${downstreamModuleFiles.length} downstream module file(s)`,
		);
	}

	return {
		filePath: normalizedFile,
		changedSymbols,
		directImporters: importerFiles,
		directCallers: callerFiles,
		neighborFiles,
		riskFlags: riskFlagList,
	};
}
