export { AnchorStateManager, hashLinesStateful } from "./anchor-state.js";
export {
	type ApplyAnchoredEditsResult,
	applyAnchoredEditsToFile,
	isAnchoredEditInput,
} from "./apply-anchored-edits.js";
export { ANCHOR_DELIMITER, formatLineWithHash } from "./line-protocol.js";
export { anchoredEditTaskId } from "./task-id.js";
export type { AnchoredEdit, AnchoredEditType } from "./types.js";
