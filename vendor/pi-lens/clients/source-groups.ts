export interface SourceGroup {
	label: string;
	files: string[];
}

export function partitionSourceFiles(
	sourceRoot: string,
	files: string[],
	maxFiles = 12,
): SourceGroup[] {
	if (maxFiles <= 0) {
		throw new Error("maxFiles must be greater than zero");
	}
	return partitionAt(
		sourceRoot.replace(/\\/g, "/"),
		normalizeFiles(files),
		maxFiles,
		0,
	);
}

function normalizeFiles(files: string[]): string[] {
	return [...new Set(files.map((file) => file.replace(/\\/g, "/")))].sort(
		(a, b) => a.localeCompare(b),
	);
}

function partitionAt(
	sourceRoot: string,
	files: string[],
	maxFiles: number,
	depth: number,
): SourceGroup[] {
	if (files.length === 0) return [];
	if (files.length <= maxFiles) {
		return [{ label: commonLabel(sourceRoot, files, depth), files }];
	}

	const directFiles: string[] = [];
	const buckets = new Map<string, string[]>();
	for (const file of files) {
		const relativePath = file.startsWith(`${sourceRoot}/`)
			? file.slice(sourceRoot.length + 1)
			: file;
		const parts = relativePath.split("/");
		if (parts.length <= depth + 1) {
			directFiles.push(file);
			continue;
		}
		const segment = parts[depth];
		if (!segment) {
			directFiles.push(file);
			continue;
		}
		const bucket = buckets.get(segment) ?? [];
		bucket.push(file);
		buckets.set(segment, bucket);
	}

	if (buckets.size === 0) {
		return chunkFiles(currentLabel(sourceRoot, files, depth), files, maxFiles);
	}

	const groups = chunkFiles(
		currentLabel(sourceRoot, files, depth),
		directFiles,
		maxFiles,
	);
	for (const [segment, bucketFiles] of [...buckets.entries()].sort(
		([left], [right]) => left.localeCompare(right),
	)) {
		if (bucketFiles.length <= maxFiles) {
			groups.push({
				label: `${sourceRoot}/${bucketPrefix(bucketFiles, sourceRoot, depth, segment)}`,
				files: bucketFiles,
			});
		} else {
			groups.push(...partitionAt(sourceRoot, bucketFiles, maxFiles, depth + 1));
		}
	}
	return groups;
}

function chunkFiles(
	label: string,
	files: string[],
	maxFiles: number,
): SourceGroup[] {
	if (files.length === 0) return [];
	if (files.length <= maxFiles) return [{ label, files }];
	const chunks: SourceGroup[] = [];
	for (let index = 0; index < files.length; index += maxFiles) {
		const part = Math.floor(index / maxFiles) + 1;
		chunks.push({
			label: `${label}#${part}`,
			files: files.slice(index, index + maxFiles),
		});
	}
	return chunks;
}

function currentLabel(
	sourceRoot: string,
	files: string[],
	depth: number,
): string {
	if (depth === 0) return sourceRoot;
	const first = files[0];
	if (!first) return sourceRoot;
	const relativePath = first.startsWith(`${sourceRoot}/`)
		? first.slice(sourceRoot.length + 1)
		: first;
	const parts = relativePath.split("/").slice(0, depth);
	return parts.length === 0 ? sourceRoot : `${sourceRoot}/${parts.join("/")}`;
}

function commonLabel(
	sourceRoot: string,
	files: string[],
	depth: number,
): string {
	if (depth === 0) return sourceRoot;
	if (files.length === 1) return files[0] ?? sourceRoot;
	return currentLabel(sourceRoot, files, depth);
}

function bucketPrefix(
	files: string[],
	sourceRoot: string,
	depth: number,
	segment: string,
): string {
	const first = files[0];
	if (!first || depth === 0) return segment;
	const relativePath = first.startsWith(`${sourceRoot}/`)
		? first.slice(sourceRoot.length + 1)
		: first;
	const parts = relativePath.split("/").slice(0, depth);
	return [...parts, segment].join("/");
}
