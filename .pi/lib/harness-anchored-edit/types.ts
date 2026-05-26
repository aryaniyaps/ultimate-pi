export type AnchoredEditType = "replace" | "insert_after" | "insert_before";

export interface AnchoredEdit {
	anchor: string;
	end_anchor?: string;
	edit_type?: AnchoredEditType;
	text: string;
}

export interface ResolvedAnchoredEdit {
	lineIdx: number;
	endIdx: number;
	edit: AnchoredEdit;
}

export interface FailedAnchoredEdit {
	edit: AnchoredEdit;
	error: string;
}
