import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "rules", "tree-sitter-queries");

function walk(dir, acc = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(full, acc);
		} else if (entry.name.endsWith(".yml")) {
			acc.push(full);
		}
	}
	return acc;
}

const files = walk(root);

let missingDefectClass = 0;
let missingInlineTier = 0;
const defectClassCounts = new Map();
const inlineTierCounts = new Map();

for (const file of files) {
	const text = fs.readFileSync(file, "utf8");
	const defectClass = (text.match(/^defect_class:\s*(.+)$/m) || [])[1]?.trim();
	const inlineTier = (text.match(/^inline_tier:\s*(.+)$/m) || [])[1]?.trim();

	if (!defectClass) {
		missingDefectClass++;
	} else {
		defectClassCounts.set(
			defectClass,
			(defectClassCounts.get(defectClass) ?? 0) + 1,
		);
	}

	if (!inlineTier) {
		missingInlineTier++;
	} else {
		inlineTierCounts.set(inlineTier, (inlineTierCounts.get(inlineTier) ?? 0) + 1);
	}
}

const report = {
	files: files.length,
	missingDefectClass,
	missingInlineTier,
	defectClassCounts: Object.fromEntries(defectClassCounts.entries()),
	inlineTierCounts: Object.fromEntries(inlineTierCounts.entries()),
};

console.log(JSON.stringify(report, null, 2));

if (missingDefectClass > 0 || missingInlineTier > 0) {
	process.exit(1);
}
