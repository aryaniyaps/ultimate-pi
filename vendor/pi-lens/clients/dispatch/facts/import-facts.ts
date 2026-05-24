import * as ts from "typescript";
import type { FactProvider } from "../fact-provider-types.js";

export interface ImportEntry {
	/** Module specifier, e.g. "node:fs", "./utils.js", "react" */
	source: string;
	/** Named imports: ["readFile", "writeFile"] */
	names: string[];
	/** Default import name, if any */
	defaultName?: string;
	/** Namespace import alias, if any (import * as X) */
	namespace?: string;
}

export const importFactProvider: FactProvider = {
	id: "fact.file.imports",
	provides: ["file.imports"],
	requires: ["file.content"],
	appliesTo(ctx) {
		return /\.tsx?$/.test(ctx.filePath);
	},
	run(ctx, store) {
		const content = store.getFileFact<string>(ctx.filePath, "file.content");
		if (!content) {
			store.setFileFact(ctx.filePath, "file.imports", []);
			return;
		}

		const sourceFile = ts.createSourceFile(
			ctx.filePath,
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TSX,
		);

		const imports: ImportEntry[] = [];

		for (const stmt of sourceFile.statements) {
			if (!ts.isImportDeclaration(stmt)) continue;
			const source = (stmt.moduleSpecifier as ts.StringLiteral).text;
			const clause = stmt.importClause;

			if (!clause) {
				imports.push({ source, names: [] });
				continue;
			}

			const entry: ImportEntry = { source, names: [] };

			if (clause.name) {
				entry.defaultName = clause.name.text;
			}

			if (clause.namedBindings) {
				if (ts.isNamespaceImport(clause.namedBindings)) {
					entry.namespace = clause.namedBindings.name.text;
				} else {
					entry.names = clause.namedBindings.elements.map((e) => e.name.text);
				}
			}

			imports.push(entry);
		}

		store.setFileFact(ctx.filePath, "file.imports", imports);
	},
};
