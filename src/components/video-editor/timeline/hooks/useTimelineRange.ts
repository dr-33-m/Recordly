import type { Range } from "dnd-timeline";
import { type RefObject, useCallback, useEffect, useMemo, useState, type WheelEvent } from "react";
import { createInitialRange, normalizeWheelDeltaToPixels } from "../core/time";
import { clampRange } from "../dnd/engine";

interface UseTimelineRangeParams {
	totalMs: number;
	minVisibleRangeMs: number;
	timelineContainerRef: RefObject<HTMLDivElement>;
}

/** Multiplier applied per zoom-in/out step from the controls or keyboard. */
export const TIMELINE_ZOOM_STEP = 1.6;

/**
 * Zoom a range around `anchorMs`, keeping the anchor at the same relative
 * position in the viewport so the timeline appears to scale under the cursor
 * or playhead rather than jumping.
 */
export function zoomRangeAroundAnchor(
	range: Range,
	factor: number,
	anchorMs: number,
	config: { totalMs: number; minVisibleRangeMs: number },
): Range {
	const { totalMs, minVisibleRangeMs } = config;
	const visibleSpan = Math.max(1, range.end - range.start);
	const clampedAnchor = Math.max(range.start, Math.min(anchorMs, range.end));
	const anchorRatio = (clampedAnchor - range.start) / visibleSpan;

	// Clamp the span *before* positioning it. Clamping the resulting range instead
	// would truncate an over-wide zoom-out against the timeline start and leave the
	// view short of the full timeline.
	const maxSpan = totalMs > 0 ? totalMs : visibleSpan / factor;
	const nextSpan = Math.min(Math.max(visibleSpan / factor, minVisibleRangeMs), maxSpan);
	const maxStart = Math.max(0, totalMs - nextSpan);
	const nextStart = Math.max(0, Math.min(clampedAnchor - anchorRatio * nextSpan, maxStart));

	return clampRange({ start: nextStart, end: nextStart + nextSpan }, config);
}

export interface TimelineWheelPanDeltaInput {
	deltaX: number;
	deltaY: number;
	deltaMode: number;
	shiftKey?: boolean;
	ctrlKey?: boolean;
	metaKey?: boolean;
	canScrollVertically?: boolean;
}

export function resolveTimelineWheelPanDeltaPx({
	deltaX,
	deltaY,
	deltaMode,
	shiftKey = false,
	ctrlKey = false,
	metaKey = false,
	canScrollVertically = true,
}: TimelineWheelPanDeltaInput) {
	if ((ctrlKey || metaKey) && !shiftKey) {
		return 0;
	}

	if (Math.abs(deltaX) > 0) {
		return normalizeWheelDeltaToPixels(deltaX, deltaMode);
	}

	if ((shiftKey || !canScrollVertically) && Math.abs(deltaY) > 0) {
		return normalizeWheelDeltaToPixels(deltaY, deltaMode);
	}

	return 0;
}

export function useTimelineRange({
	totalMs,
	minVisibleRangeMs,
	timelineContainerRef,
}: UseTimelineRangeParams) {
	const [range, setRange] = useState<Range>(() => createInitialRange(totalMs));

	useEffect(() => {
		setRange(createInitialRange(totalMs));
	}, [totalMs]);

	const clampedRange = useMemo<Range>(() => {
		if (totalMs === 0) {
			return range;
		}
		return {
			start: Math.max(0, Math.min(range.start, totalMs)),
			end: Math.min(range.end, totalMs),
		};
	}, [range, totalMs]);

	const panTimelineRange = useCallback(
		(deltaMs: number) => {
			if (!Number.isFinite(deltaMs) || deltaMs === 0 || totalMs <= 0) {
				return;
			}

			setRange((previous) => {
				const visibleSpan = Math.max(1, previous.end - previous.start);
				const maxStart = Math.max(0, totalMs - visibleSpan);
				const nextStart = Math.max(0, Math.min(previous.start + deltaMs, maxStart));
				return { start: nextStart, end: nextStart + visibleSpan };
			});
		},
		[totalMs],
	);

	const handleTimelineWheel = useCallback(
		(event: WheelEvent<HTMLDivElement>) => {
			if (((event.ctrlKey || event.metaKey) && !event.shiftKey) || totalMs <= 0) {
				return;
			}

			const container = timelineContainerRef.current;
			const horizontalDeltaPx = resolveTimelineWheelPanDeltaPx({
				deltaX: event.deltaX,
				deltaY: event.deltaY,
				deltaMode: event.deltaMode,
				shiftKey: event.shiftKey,
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
				canScrollVertically: container
					? container.scrollHeight > container.clientHeight + 1
					: true,
			});

			if (horizontalDeltaPx === 0) {
				return;
			}

			const containerWidth = container?.clientWidth ?? 0;
			const visibleRangeMs = clampedRange.end - clampedRange.start;
			if (containerWidth <= 0 || visibleRangeMs <= 0) {
				return;
			}

			event.preventDefault();
			const deltaMs = (horizontalDeltaPx / containerWidth) * visibleRangeMs;
			panTimelineRange(deltaMs);
		},
		[clampedRange.end, clampedRange.start, panTimelineRange, timelineContainerRef, totalMs],
	);

	const zoomTimelineRange = useCallback(
		(factor: number, anchorMs?: number) => {
			if (totalMs <= 0 || !Number.isFinite(factor) || factor <= 0) {
				return;
			}

			setRange((previous) => {
				const normalized = clampRange(previous, { totalMs, minVisibleRangeMs });
				const anchor = Number.isFinite(anchorMs)
					? (anchorMs as number)
					: (normalized.start + normalized.end) / 2;
				return zoomRangeAroundAnchor(normalized, factor, anchor, {
					totalMs,
					minVisibleRangeMs,
				});
			});
		},
		[minVisibleRangeMs, totalMs],
	);

	const fitTimelineRange = useCallback(() => {
		setRange(createInitialRange(totalMs));
	}, [totalMs]);

	// How many times the full timeline is magnified in the current viewport.
	const zoomFactor = useMemo(() => {
		const visibleSpan = clampedRange.end - clampedRange.start;
		if (totalMs <= 0 || visibleSpan <= 0) return 1;
		return totalMs / visibleSpan;
	}, [clampedRange.end, clampedRange.start, totalMs]);

	const canZoomIn = totalMs > 0 && clampedRange.end - clampedRange.start > minVisibleRangeMs + 1;
	const canZoomOut = totalMs > 0 && zoomFactor > 1.001;

	return {
		range,
		setRange,
		clampedRange,
		handleTimelineWheel,
		zoomTimelineRange,
		fitTimelineRange,
		zoomFactor,
		canZoomIn,
		canZoomOut,
	};
}
