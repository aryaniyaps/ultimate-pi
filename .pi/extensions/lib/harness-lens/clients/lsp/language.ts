import path from "node:path";

/**
 * Language ID Mappings for LSP
 * 
 * Maps file extensions to LSP language identifiers.
 */

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
	// JavaScript/TypeScript
	".ts": "typescript",
	".tsx": "typescriptreact",
	".mts": "typescript",
	".cts": "typescript",
	".js": "javascript",
	".jsx": "javascriptreact",
	".mjs": "javascript",
	".cjs": "javascript",
	".svelte": "svelte",
	".vue": "vue",
	".astro": "astro",

	// Python
	".py": "python",
	".pyi": "python",

	// Go
	".go": "go",
	".mod": "go",
	".sum": "go",

	// Rust
	".rs": "rust",
	".ron": "rust",

	// C/C++
	".c": "c",
	".cpp": "cpp",
	".cc": "cpp",
	".cxx": "cpp",
	".h": "c",
	".hpp": "cpp",
	".hh": "cpp",

	// Java
	".java": "java",

	// Kotlin
	".kt": "kotlin",
	".kts": "kotlin",

	// Ruby
	".rb": "ruby",
	".rake": "ruby",
	".gemspec": "ruby",
	".ru": "ruby",

	// PHP
	".php": "php",

	// C#
	".cs": "csharp",

	// F#
	".fs": "fsharp",
	".fsi": "fsharp",
	".fsx": "fsharp",

	// Swift
	".swift": "swift",

	// Dart
	".dart": "dart",

	// Lua
	".lua": "lua",

	// Shell
	".sh": "shellscript",
	".bash": "shellscript",
	".zsh": "shellscript",
	".fish": "shellscript",

	// JSON/YAML
	".json": "json",
	".jsonc": "jsonc",
	".yaml": "yaml",
	".yml": "yaml",

	// Markdown
	".md": "markdown",
	".mdx": "markdown",

	// CSS
	".css": "css",
	".scss": "scss",
	".sass": "sass",
	".less": "less",

	// HTML
	".html": "html",
	".htm": "html",

	// SQL
	".sql": "sql",

	// Docker
	".dockerfile": "dockerfile",
	"Dockerfile": "dockerfile",

	// Terraform
	".tf": "terraform",
	".tfvars": "terraform",

	// Nix
	".nix": "nix",

	// Elixir
	".ex": "elixir",
	".exs": "elixir",

	// Haskell
	".hs": "haskell",
	".lhs": "haskell",

	// OCaml
	".ml": "ocaml",
	".mli": "ocaml",

	// Zig
	".zig": "zig",
	".zon": "zig",

	// Gleam
	".gleam": "gleam",

	// Clojure
	".clj": "clojure",
	".cljs": "clojure",
	".cljc": "clojure",
	".edn": "clojure",

	// Scala
	".scala": "scala",
	".sc": "scala",

	// R
	".r": "r",
	".R": "r",

	// Julia
	".jl": "julia",

	// Perl
	".pl": "perl",
	".pm": "perl",

	// Erlang
	".erl": "erlang",
	".hrl": "erlang",

	// Fortran
	".f": "fortran",
	".f90": "fortran",
	".f95": "fortran",

	// COBOL
	".cob": "cobol",
	".cbl": "cobol",

	// Pascal
	".pas": "pascal",
	".pp": "pascal",

	// Ada
	".adb": "ada",
	".ads": "ada",

	// VHDL/Verilog
	".vhd": "vhdl",
	".vhdl": "vhdl",
	".v": "verilog",
	".sv": "systemverilog",

	// GraphQL
	".graphql": "graphql",
	".gql": "graphql",

	// Protocol Buffers
	".proto": "proto",

	// TOML
	".toml": "toml",

	// Prisma
	".prisma": "prisma",

	// Typst
	".typ": "typst",
	".typc": "typst",
} as const;

/**
 * Get language ID for a file path
 */
export function getLanguageId(filePath: string): string | undefined {
	const ext = path.extname(filePath).toLowerCase();
	if (ext && LANGUAGE_EXTENSIONS[ext]) {
		return LANGUAGE_EXTENSIONS[ext];
	}

	const base = path.basename(filePath);
	return LANGUAGE_EXTENSIONS[base] ?? LANGUAGE_EXTENSIONS[base.toLowerCase()];
}

/**
 * Get all extensions for a language ID
 */
export function getExtensionsForLanguage(languageId: string): string[] {
	return Object.entries(LANGUAGE_EXTENSIONS)
		.filter(([, id]) => id === languageId)
		.map(([ext]) => ext);
}
