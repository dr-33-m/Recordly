/** Modifier state forwarded from the originating mouse event on a timeline item. */
export interface SelectionModifiers {
	/** Ctrl (or Cmd on macOS) — toggle the clicked item in/out of the selection. */
	toggle?: boolean;
	/** Shift — extend the selection from the last anchor to the clicked item. */
	range?: boolean;
}

export interface ZoomSelectionState {
	/** The zoom multi-selection. Empty means "no multi-selection". */
	ids: string[];
	/** Anchor for a subsequent shift-click range. */
	anchorId: string | null;
	/**
	 * The zoom the settings panel should show. Null whenever the selection is
	 * ambiguous (zero or many), so the panel does not pick an arbitrary one.
	 */
	primaryId: string | null;
}

interface ResolveZoomSelectionParams {
	/** All zoom ids in timeline order — the basis for shift-click ranges. */
	orderedIds: string[];
	/** The current multi-selection. */
	currentIds: string[];
	/** The current single selection, if any. */
	primaryId: string | null;
	anchorId: string | null;
	targetId: string | null;
	modifiers?: SelectionModifiers;
}

/**
 * Works out the next zoom selection from a click. Plain click replaces, ctrl/cmd
 * toggles, shift extends from the anchor.
 */
export function resolveZoomSelection({
	orderedIds,
	currentIds,
	primaryId,
	anchorId,
	targetId,
	modifiers,
}: ResolveZoomSelectionParams): ZoomSelectionState {
	if (targetId === null) {
		return { ids: [], anchorId: null, primaryId: null };
	}

	if (modifiers?.range && anchorId) {
		const anchorIndex = orderedIds.indexOf(anchorId);
		const targetIndex = orderedIds.indexOf(targetId);
		if (anchorIndex !== -1 && targetIndex !== -1) {
			const [from, to] =
				anchorIndex <= targetIndex
					? [anchorIndex, targetIndex]
					: [targetIndex, anchorIndex];
			// The anchor stays put so the range can be re-dragged from the same end.
			return { ids: orderedIds.slice(from, to + 1), anchorId, primaryId: null };
		}
	}

	if (modifiers?.toggle) {
		// Promote an existing single selection into the set before toggling, so
		// ctrl-clicking a second block keeps the first one.
		const base = currentIds.length === 0 && primaryId ? [primaryId] : currentIds;
		const ids = base.includes(targetId)
			? base.filter((id) => id !== targetId)
			: [...base, targetId];
		return { ids, anchorId: targetId, primaryId: null };
	}

	return { ids: [], anchorId: targetId, primaryId: targetId };
}

export type DeleteSelectionTarget =
	| "keyframe"
	| "zoom"
	| "clip"
	| "annotation"
	| "audio"
	| "caption"
	| "none";

interface ResolveDeleteSelectionTargetParams {
	/** True when one or more zooms are multi-selected (marquee, ctrl/shift-click, select-all). */
	hasZoomMultiSelection: boolean;
	selectedKeyframeId: string | null;
	selectedZoomId: string | null;
	selectedClipId?: string | null;
	selectedAnnotationId?: string | null;
	selectedAudioId?: string | null;
	selectedCaptionId?: string | null;
}

export function resolveDeleteSelectionTarget({
	hasZoomMultiSelection,
	selectedKeyframeId,
	selectedZoomId,
	selectedClipId,
	selectedAnnotationId,
	selectedAudioId,
	selectedCaptionId,
}: ResolveDeleteSelectionTargetParams): DeleteSelectionTarget {
	if (hasZoomMultiSelection) return "zoom";
	if (selectedKeyframeId) return "keyframe";
	if (selectedZoomId) return "zoom";
	if (selectedClipId) return "clip";
	if (selectedAnnotationId) return "annotation";
	if (selectedAudioId) return "audio";
	if (selectedCaptionId) return "caption";
	return "none";
}
