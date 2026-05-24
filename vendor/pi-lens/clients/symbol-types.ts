/**
 * Symbol types for pi-lens
 * Shared between SymbolService and runners
 */

export type SymbolKind =
	| "function"
	| "class"
	| "variable"
	| "interface"
	| "type"
	| "method"
	| "property";

export interface Symbol {
	id: string; // filePath:name:kind (unique identifier)
	name: string;
	kind: SymbolKind;
	filePath: string;
	line: number;
	column: number;
	signature?: string; // For functions: "(a: T, b: U) => R"
	isExported: boolean;
	doc?: string; // JSDoc comment if available
}

export interface SymbolRef {
	symbolId: string; // Reference to which symbol (by id)
	filePath: string;
	line: number;
	column: number;
	context?: string; // Surrounding line for context
}

export interface SymbolIndex {
	version: string;
	createdAt: string;
	symbols: Map<string, Symbol>; // symbolId -> Symbol
	refs: Map<string, SymbolRef[]>; // symbolId -> references
	byFile: Map<string, string[]>; // filePath -> symbolIds in that file
}

export interface CallEdge {
	caller: string; // symbolId of caller
	callerFile: string;
	callerLine: number;
	callerColumn: number;
	callee: string; // symbolId or external name
	calleeResolved: boolean; // true if callee is in project symbols
}

export interface CallGraph {
	edges: CallEdge[];
	adjacency: Map<string, string[]>; // caller symbolId -> callees
	reverse: Map<string, string[]>; // callee symbolId -> callers
	cycles: string[][]; // Detected circular call chains
	orphans: string[]; // Symbols defined but never called
	entryPoints: string[]; // Symbols called but never defined (exports, main)
}

// Serializable versions for JSON storage
export interface SerializableSymbolIndex {
	version: string;
	createdAt: string;
	symbols: [string, Symbol][];
	refs: [string, SymbolRef[]][];
	byFile: [string, string[]][];
}

export interface SerializableCallGraph {
	edges: CallEdge[];
	adjacency: [string, string[]][];
	reverse: [string, string[]][];
	cycles: string[][];
	orphans: string[];
	entryPoints: string[];
}
