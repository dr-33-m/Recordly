import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { TimelineRegion } from "../core/timelineTypes";
import { resolveZoomSelection, type SelectionModifiers } from "./utils/timelineSelectionUtils";

export type { SelectionModifiers };

interface UseTimelineSelectionParams {
	totalMs: number;
	currentTimeMs: number;
	zoomRegions: TimelineRegion[];
	clipRegions: TimelineRegion[];
	annotationRegions: (TimelineRegion & { zIndex: number })[];
	audioRegions: TimelineRegion[];
	selectedZoomId: string | null;
	selectedClipId?: string | null;
	selectedAnnotationId?: string | null;
	selectedAudioId?: string | null;
	selectedCaptionId?: string | null;
	onZoomDelete: (id: string) => void;
	onZoomDeleteMany?: (ids: string[]) => void;
	onZoomSelectionChange?: (ids: string[]) => void;
	onClipDelete?: (id: string) => void;
	onAnnotationDelete?: (id: string) => void;
	onAudioDelete?: (id: string) => void;
	onCaptionDelete?: (id: string) => void;
	onSelectZoom: (id: string | null) => void;
	onSelectClip?: (id: string | null) => void;
	onSelectAnnotation?: (id: string | null) => void;
	onSelectAudio?: (id: string | null) => void;
	onSelectCaption?: (id: string | null) => void;
}

export function useTimelineSelection({
	totalMs,
	currentTimeMs,
	zoomRegions,
	annotationRegions,
	selectedZoomId,
	selectedClipId,
	selectedAnnotationId,
	selectedAudioId,
	selectedCaptionId,
	onZoomDelete,
	onZoomDeleteMany,
	onZoomSelectionChange,
	onClipDelete,
	onAnnotationDelete,
	onAudioDelete,
	onCaptionDelete,
	onSelectZoom,
	onSelectClip,
	onSelectAnnotation,
	onSelectAudio,
	onSelectCaption,
}: UseTimelineSelectionParams) {
	const [keyframes, setKeyframes] = useState<{ id: string; time: number }[]>([]);
	const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
	const [multiSelectedZoomIds, setMultiSelectedZoomIds] = useState<string[]>([]);
	// Anchor for shift-click range selection.
	const zoomRangeAnchorIdRef = useRef<string | null>(null);
	const hasAnyZoomBlocks = useMemo(() => zoomRegions.length > 0, [zoomRegions.length]);

	const multiSelectedZoomIdSet = useMemo(
		() => new Set(multiSelectedZoomIds),
		[multiSelectedZoomIds],
	);

	// Zooms ordered by time — the basis for shift-click ranges and marquee hits.
	const orderedZoomIds = useMemo(
		() => [...zoomRegions].sort((a, b) => a.startMs - b.startMs).map((region) => region.id),
		[zoomRegions],
	);

	// Drop ids for zooms that no longer exist (deleted elsewhere, project reloaded…).
	useEffect(() => {
		setMultiSelectedZoomIds((previous) => {
			if (previous.length === 0) return previous;
			const live = new Set(orderedZoomIds);
			const next = previous.filter((id) => live.has(id));
			return next.length === previous.length ? previous : next;
		});
	}, [orderedZoomIds]);

	useEffect(() => {
		onZoomSelectionChange?.(multiSelectedZoomIds);
	}, [multiSelectedZoomIds, onZoomSelectionChange]);

	/**
	 * Every zoom that a delete should remove: the explicit multi-selection when
	 * there is one, otherwise the single selected zoom.
	 */
	const effectiveSelectedZoomIds = useMemo(() => {
		if (multiSelectedZoomIds.length > 0) return multiSelectedZoomIds;
		return selectedZoomId ? [selectedZoomId] : [];
	}, [multiSelectedZoomIds, selectedZoomId]);

	const addKeyframe = useCallback(() => {
		if (totalMs === 0) return;
		const time = Math.max(0, Math.min(currentTimeMs, totalMs));
		if (keyframes.some((kf) => Math.abs(kf.time - time) < 1)) return;
		setKeyframes((prev) => [...prev, { id: uuidv4(), time }]);
	}, [currentTimeMs, totalMs, keyframes]);

	const deleteSelectedKeyframe = useCallback(() => {
		if (!selectedKeyframeId) return;
		setKeyframes((prev) => prev.filter((kf) => kf.id !== selectedKeyframeId));
		setSelectedKeyframeId(null);
	}, [selectedKeyframeId]);

	const handleKeyframeMove = useCallback(
		(id: string, newTime: number) => {
			setKeyframes((prev) =>
				prev.map((kf) =>
					kf.id === id ? { ...kf, time: Math.max(0, Math.min(newTime, totalMs)) } : kf,
				),
			);
		},
		[totalMs],
	);

	/**
	 * Deletes every zoom in the current selection. Bulk deletes go through
	 * `onZoomDeleteMany` so 200+ regions collapse into a single state update —
	 * and therefore a single undo step — instead of one per region.
	 */
	const deleteSelectedZoom = useCallback(() => {
		const ids = effectiveSelectedZoomIds;
		if (ids.length === 0) return;

		if (onZoomDeleteMany) {
			onZoomDeleteMany(ids);
		} else {
			ids.forEach((id) => onZoomDelete(id));
		}

		onSelectZoom(null);
		onSelectClip?.(null);
		onSelectAnnotation?.(null);
		onSelectAudio?.(null);
		onSelectCaption?.(null);
		setMultiSelectedZoomIds([]);
		zoomRangeAnchorIdRef.current = null;
	}, [
		effectiveSelectedZoomIds,
		onZoomDelete,
		onZoomDeleteMany,
		onSelectZoom,
		onSelectClip,
		onSelectAnnotation,
		onSelectAudio,
		onSelectCaption,
	]);

	const deleteSelectedClip = useCallback(() => {
		if (!selectedClipId || !onClipDelete || !onSelectClip) return;
		onClipDelete(selectedClipId);
		onSelectClip(null);
	}, [selectedClipId, onClipDelete, onSelectClip]);

	const deleteSelectedAnnotation = useCallback(() => {
		if (!selectedAnnotationId || !onAnnotationDelete || !onSelectAnnotation) return;
		onAnnotationDelete(selectedAnnotationId);
		onSelectAnnotation(null);
	}, [selectedAnnotationId, onAnnotationDelete, onSelectAnnotation]);

	const deleteSelectedAudio = useCallback(() => {
		if (!selectedAudioId || !onAudioDelete || !onSelectAudio) return;
		onAudioDelete(selectedAudioId);
		onSelectAudio(null);
	}, [selectedAudioId, onAudioDelete, onSelectAudio]);

	const deleteSelectedCaption = useCallback(() => {
		if (!selectedCaptionId || !onCaptionDelete) return;
		onCaptionDelete(selectedCaptionId);
		onSelectCaption?.(null);
	}, [selectedCaptionId, onCaptionDelete, onSelectCaption]);

	const clearSelectedBlocks = useCallback(() => {
		onSelectZoom(null);
		onSelectClip?.(null);
		onSelectAnnotation?.(null);
		onSelectAudio?.(null);
		onSelectCaption?.(null);
		setMultiSelectedZoomIds([]);
		zoomRangeAnchorIdRef.current = null;
	}, [onSelectZoom, onSelectClip, onSelectAnnotation, onSelectAudio, onSelectCaption]);

	const activateSelectAllZooms = useCallback(() => {
		onSelectZoom(null);
		onSelectClip?.(null);
		onSelectAnnotation?.(null);
		onSelectAudio?.(null);
		onSelectCaption?.(null);
		setSelectedKeyframeId(null);
		setMultiSelectedZoomIds(orderedZoomIds);
		zoomRangeAnchorIdRef.current = orderedZoomIds[0] ?? null;
	}, [
		orderedZoomIds,
		onSelectZoom,
		onSelectClip,
		onSelectAnnotation,
		onSelectAudio,
		onSelectCaption,
	]);

	/** Replace the zoom multi-selection wholesale (used by the marquee). */
	const setZoomSelection = useCallback(
		(ids: string[]) => {
			setMultiSelectedZoomIds(ids);
			zoomRangeAnchorIdRef.current = ids[0] ?? null;
			// Keep the settings panel pointed at a single region only when the
			// selection is unambiguous.
			onSelectZoom(ids.length === 1 ? ids[0] : null);
			if (ids.length > 0) {
				onSelectClip?.(null);
				onSelectAnnotation?.(null);
				onSelectAudio?.(null);
				onSelectCaption?.(null);
				setSelectedKeyframeId(null);
			}
		},
		[onSelectZoom, onSelectClip, onSelectAnnotation, onSelectAudio, onSelectCaption],
	);

	const handleSelectZoom = useCallback(
		(id: string | null, modifiers?: SelectionModifiers) => {
			const next = resolveZoomSelection({
				orderedIds: orderedZoomIds,
				currentIds: multiSelectedZoomIds,
				primaryId: selectedZoomId,
				anchorId: zoomRangeAnchorIdRef.current,
				targetId: id,
				modifiers,
			});

			setMultiSelectedZoomIds(next.ids);
			zoomRangeAnchorIdRef.current = next.anchorId;
			onSelectZoom(next.primaryId);
		},
		[multiSelectedZoomIds, orderedZoomIds, selectedZoomId, onSelectZoom],
	);

	const handleSelectClip = useCallback(
		(id: string | null) => {
			setMultiSelectedZoomIds([]);
			onSelectClip?.(id);
		},
		[onSelectClip],
	);

	const handleSelectAnnotation = useCallback(
		(id: string | null) => {
			setMultiSelectedZoomIds([]);
			onSelectAnnotation?.(id);
		},
		[onSelectAnnotation],
	);

	const handleSelectAudio = useCallback(
		(id: string | null) => {
			setMultiSelectedZoomIds([]);
			onSelectAudio?.(id);
		},
		[onSelectAudio],
	);

	const handleSelectCaption = useCallback(
		(id: string | null) => {
			setMultiSelectedZoomIds([]);
			onSelectCaption?.(id);
		},
		[onSelectCaption],
	);

	const cycleAnnotationsAtCurrentTime = useCallback(
		(backward = false) => {
			const overlapping = annotationRegions
				.filter((a) => currentTimeMs >= a.startMs && currentTimeMs <= a.endMs)
				.sort((a, b) => a.zIndex - b.zIndex);
			if (overlapping.length === 0) {
				return false;
			}

			if (!selectedAnnotationId || !overlapping.some((a) => a.id === selectedAnnotationId)) {
				onSelectAnnotation?.(overlapping[0].id);
				return true;
			}

			const currentIndex = overlapping.findIndex((a) => a.id === selectedAnnotationId);
			const nextIndex = backward
				? (currentIndex - 1 + overlapping.length) % overlapping.length
				: (currentIndex + 1) % overlapping.length;
			onSelectAnnotation?.(overlapping[nextIndex].id);
			return true;
		},
		[annotationRegions, currentTimeMs, selectedAnnotationId, onSelectAnnotation],
	);

	return {
		keyframes,
		selectedKeyframeId,
		setSelectedKeyframeId,
		multiSelectedZoomIds,
		multiSelectedZoomIdSet,
		effectiveSelectedZoomIds,
		setZoomSelection,
		hasAnyZoomBlocks,
		activateSelectAllZooms,
		addKeyframe,
		deleteSelectedKeyframe,
		handleKeyframeMove,
		deleteSelectedZoom,
		deleteSelectedClip,
		deleteSelectedAnnotation,
		deleteSelectedAudio,
		deleteSelectedCaption,
		clearSelectedBlocks,
		handleSelectZoom,
		handleSelectClip,
		handleSelectAnnotation,
		handleSelectAudio,
		handleSelectCaption,
		cycleAnnotationsAtCurrentTime,
	};
}
