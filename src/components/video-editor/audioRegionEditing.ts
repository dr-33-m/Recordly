import type { AudioRegion } from "./types";

/** Upper bound on regions created by a single "repeat to end", as a runaway guard. */
export const MAX_AUDIO_REPEAT_COPIES = 500;

export function getAudioSourceStartMs(region: AudioRegion): number {
	return Math.max(0, Math.round(region.sourceStartMs ?? 0));
}

function clampSourceStartMs(region: AudioRegion, candidate: number): number {
	const maxOffset =
		region.sourceDurationMs !== undefined
			? Math.max(0, region.sourceDurationMs - 1)
			: Number.POSITIVE_INFINITY;
	return Math.max(0, Math.min(Math.round(candidate), maxOffset));
}

/**
 * Applies a timeline span change to an audio region.
 *
 * Moving a region (both edges shift equally) keeps playing the same part of the
 * file, so the source offset is untouched. Dragging the *left* edge is a real
 * trim: the region now starts later in the file, so the offset advances by the
 * same amount. Dragging the right edge only changes the length.
 */
export function applyAudioSpanChange(
	region: AudioRegion,
	span: { start: number; end: number },
): AudioRegion {
	const startMs = Math.round(span.start);
	const endMs = Math.round(span.end);
	const startDelta = startMs - region.startMs;
	const lengthDelta = endMs - region.endMs - startDelta;
	const isMove = lengthDelta === 0;

	return {
		...region,
		startMs,
		endMs,
		sourceStartMs:
			isMove || startDelta === 0
				? getAudioSourceStartMs(region)
				: clampSourceStartMs(region, getAudioSourceStartMs(region) + startDelta),
	};
}

/**
 * Splits a region at a timeline position. The right half resumes at the point in
 * the source file the cut landed on, so the two halves play back seamlessly.
 * Returns null when the position is not strictly inside the region.
 */
export function splitAudioRegion(
	region: AudioRegion,
	atMs: number,
	makeId: () => string,
): [AudioRegion, AudioRegion] | null {
	const splitMs = Math.round(atMs);
	if (splitMs <= region.startMs || splitMs >= region.endMs) return null;

	const sourceStartMs = getAudioSourceStartMs(region);
	return [
		{ ...region, id: makeId(), endMs: splitMs, sourceStartMs },
		{
			...region,
			id: makeId(),
			startMs: splitMs,
			sourceStartMs: sourceStartMs + (splitMs - region.startMs),
		},
	];
}

function overlapsAny(
	candidate: { startMs: number; endMs: number },
	regions: AudioRegion[],
): boolean {
	return regions.some(
		(region) => candidate.startMs < region.endMs && candidate.endMs > region.startMs,
	);
}

/**
 * Tiles copies of a region from its end to the end of the timeline — the way you
 * stretch a short music bed across a long recording. Copies stop at the first
 * occupied slot on the track and the last one is truncated to the timeline end.
 */
export function buildAudioRepeats(
	region: AudioRegion,
	allRegions: AudioRegion[],
	totalMs: number,
	makeId: () => string,
): AudioRegion[] {
	const durationMs = region.endMs - region.startMs;
	if (durationMs <= 0 || region.endMs >= totalMs) return [];

	const trackIndex = region.trackIndex ?? 0;
	const trackRegions = allRegions.filter((other) => (other.trackIndex ?? 0) === trackIndex);

	const copies: AudioRegion[] = [];
	let cursorMs = region.endMs;
	while (cursorMs < totalMs && copies.length < MAX_AUDIO_REPEAT_COPIES) {
		const endMs = Math.min(cursorMs + durationMs, totalMs);
		if (endMs - cursorMs < 1) break;

		const candidate = { startMs: cursorMs, endMs };
		if (overlapsAny(candidate, trackRegions)) break;

		copies.push({
			...region,
			id: makeId(),
			startMs: candidate.startMs,
			endMs: candidate.endMs,
			sourceStartMs: getAudioSourceStartMs(region),
		});
		cursorMs = endMs;
	}

	return copies;
}
