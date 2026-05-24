/**
 * State Matrix Builder
 *
 * Implements Amain's 57×72 state transfer matrix construction.
 * Counts parent→child transitions in the TypeScript AST.
 */

import * as ts from "typescript";
import { getStateIndex, NUM_STATES, NUM_SYNTAX } from "./amain-types.js";

// ============================================================================
// Matrix Construction
// ============================================================================

/**
 * Build a 57×72 state transfer matrix from TypeScript source code.
 *
 * matrix[i][j] = count of transitions from syntax state i to state j
 *
 * @param sourceCode TypeScript source code
 * @returns 57×72 matrix of transition counts
 */
export function buildStateMatrix(sourceCode: string): number[][] {
	const sourceFile = ts.createSourceFile(
		"temp.ts",
		sourceCode,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);

	// Initialize 57×72 matrix with zeros
	const matrix: number[][] = Array(NUM_SYNTAX)
		.fill(0)
		.map(() => Array(NUM_STATES).fill(0));

	// Walk AST and count transitions
	function visitNode(node: ts.Node, parentKind?: number) {
		const nodeState = getStateIndex(node);

		if (parentKind !== undefined) {
			const parentState = getStateIndex({ kind: parentKind } as ts.Node);
			// Only count transitions from syntax states (first 57)
			if (parentState < NUM_SYNTAX) {
				matrix[parentState][nodeState]++;
			}
		}

		// Continue to children
		ts.forEachChild(node, (child) => visitNode(child, node.kind));
	}

	visitNode(sourceFile);
	return matrix;
}

/**
 * Build matrix from a source file node (for incremental updates)
 */
export function buildStateMatrixFromFile(
	sourceFile: ts.SourceFile,
): number[][] {
	// Initialize 57×72 matrix with zeros
	const matrix: number[][] = Array(NUM_SYNTAX)
		.fill(0)
		.map(() => Array(NUM_STATES).fill(0));

	// Walk AST and count transitions
	function visitNode(node: ts.Node, parentKind?: number) {
		const nodeState = getStateIndex(node);

		if (parentKind !== undefined) {
			const parentState = getStateIndex({ kind: parentKind } as ts.Node);
			// Only count transitions from syntax states (first 57)
			if (parentState < NUM_SYNTAX) {
				matrix[parentState][nodeState]++;
			}
		}

		// Continue to children
		ts.forEachChild(node, (child) => visitNode(child, node.kind));
	}

	visitNode(sourceFile);
	return matrix;
}

// ============================================================================
// Probability Normalization
// ============================================================================

/**
 * Convert count matrix to probability matrix.
 * Each row sums to 1 (Markov chain property).
 *
 * @param matrix 57×72 count matrix
 * @returns 57×72 probability matrix
 */
export function toProbabilityMatrix(matrix: number[][]): number[][] {
	return matrix.map((row) => {
		const sum = row.reduce((a, b) => a + b, 0);
		if (sum === 0) return row.map(() => 0);
		return row.map((val) => val / sum);
	});
}

// ============================================================================
// Similarity Calculation
// ============================================================================

/**
 * Calculate cosine similarity between two state matrices.
 * Returns 0-1 similarity score (1 = identical).
 *
 * @param matrix1 57×72 count matrix
 * @param matrix2 57×72 count matrix
 * @returns similarity score 0-1
 */
export function calculateSimilarity(
	matrix1: number[][],
	matrix2: number[][],
): number {
	const prob1 = toProbabilityMatrix(matrix1);
	const prob2 = toProbabilityMatrix(matrix2);

	const similarities: number[] = [];

	for (let i = 0; i < NUM_SYNTAX; i++) {
		const row1 = prob1[i];
		const row2 = prob2[i];

		// Skip if both rows are empty
		const hasData1 = row1.some((v) => v > 0);
		const hasData2 = row2.some((v) => v > 0);

		if (hasData1 || hasData2) {
			// Calculate cosine similarity for this state
			let dotProduct = 0;
			let norm1 = 0;
			let norm2 = 0;

			for (let j = 0; j < NUM_STATES; j++) {
				dotProduct += row1[j] * row2[j];
				norm1 += row1[j] * row1[j];
				norm2 += row2[j] * row2[j];
			}

			if (norm1 > 0 && norm2 > 0) {
				similarities.push(dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2)));
			}
		}
	}

	// Return average similarity across all states
	if (similarities.length === 0) return 0;
	return similarities.reduce((a, b) => a + b, 0) / similarities.length;
}

/**
 * Calculate similarity from source code directly (convenience method)
 */
export function calculateSimilarityFromCode(
	code1: string,
	code2: string,
): number {
	const matrix1 = buildStateMatrix(code1);
	const matrix2 = buildStateMatrix(code2);
	return calculateSimilarity(matrix1, matrix2);
}

// ============================================================================
// Matrix Statistics (for guardrails)
// ============================================================================

/**
 * Count total non-zero transitions in matrix (proxy for function complexity)
 */
export function countTransitions(matrix: number[][]): number {
	return matrix.flat().filter((v) => v > 0).length;
}

/**
 * Check if function meets complexity threshold (>20 transitions)
 */
export function isComplexEnough(matrix: number[][]): boolean {
	return countTransitions(matrix) >= 20;
}

/**
 * Serialize matrix for storage (sparse format to save space)
 */
export function serializeMatrix(matrix: number[][]): number[][] {
	// Return full matrix for now - can optimize to sparse later if needed
	return matrix;
}

/**
 * Deserialize matrix from storage
 */
export function deserializeMatrix(data: number[][]): number[][] {
	return data;
}
