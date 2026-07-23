import { describe, expect, it } from "vitest";
import {
	applyAudioSpanChange,
	buildAudioRepeats,
	getAudioSourceStartMs,
	MAX_AUDIO_REPEAT_COPIES,
	splitAudioRegion,
} from "./audioRegionEditing";
import type { AudioRegion } from "./types";

function makeRegion(overrides: Partial<AudioRegion> = {}): AudioRegion {
	return {
		id: "audio-1",
		startMs: 10_000,
		endMs: 190_000,
		audioPath: "/music/song.mp3",
		volume: 1,
		normalize: false,
		trackIndex: 0,
		sourceStartMs: 0,
		sourceDurationMs: 180_000,
		...overrides,
	};
}

function makeIdFactory() {
	let next = 0;
	return () => `audio-new-${next++}`;
}

describe("getAudioSourceStartMs", () => {
	it("defaults to 0 for regions saved before source offsets existed", () => {
		const { sourceStartMs: _omitted, ...legacy } = makeRegion();
		expect(getAudioSourceStartMs(legacy as AudioRegion)).toBe(0);
	});
});

describe("applyAudioSpanChange", () => {
	it("leaves the source offset alone when the region is moved", () => {
		const region = makeRegion({ sourceStartMs: 5_000 });
		const moved = applyAudioSpanChange(region, { start: 40_000, end: 220_000 });

		expect(moved.startMs).toBe(40_000);
		expect(moved.endMs).toBe(220_000);
		expect(moved.sourceStartMs).toBe(5_000);
	});

	it("advances the source offset when the left edge is trimmed in", () => {
		const region = makeRegion({ sourceStartMs: 0 });
		const trimmed = applyAudioSpanChange(region, { start: 40_000, end: 190_000 });

		// Region starts 30s later on the timeline, so it starts 30s later in the file.
		expect(trimmed.sourceStartMs).toBe(30_000);
		expect(trimmed.endMs).toBe(190_000);
	});

	it("rewinds the source offset when the left edge is dragged back out", () => {
		const region = makeRegion({ startMs: 40_000, sourceStartMs: 30_000 });
		const restored = applyAudioSpanChange(region, { start: 25_000, end: 190_000 });

		expect(restored.sourceStartMs).toBe(15_000);
	});

	it("never lets the source offset go negative", () => {
		const region = makeRegion({ startMs: 10_000, sourceStartMs: 2_000 });
		const restored = applyAudioSpanChange(region, { start: 0, end: 190_000 });

		expect(restored.sourceStartMs).toBe(0);
	});

	it("clamps the source offset to the length of the file", () => {
		const region = makeRegion({ sourceStartMs: 0, sourceDurationMs: 60_000 });
		const trimmed = applyAudioSpanChange(region, { start: 500_000, end: 600_000 });

		expect(trimmed.sourceStartMs).toBe(59_999);
	});

	it("leaves the source offset alone when only the right edge moves", () => {
		const region = makeRegion({ sourceStartMs: 4_000 });
		const shortened = applyAudioSpanChange(region, { start: 10_000, end: 90_000 });

		expect(shortened.sourceStartMs).toBe(4_000);
		expect(shortened.endMs).toBe(90_000);
	});
});

describe("splitAudioRegion", () => {
	it("splits into halves that together cover the original span", () => {
		const region = makeRegion();
		const halves = splitAudioRegion(region, 100_000, makeIdFactory());

		expect(halves).not.toBeNull();
		const [left, right] = halves as [AudioRegion, AudioRegion];
		expect(left.startMs).toBe(region.startMs);
		expect(left.endMs).toBe(100_000);
		expect(right.startMs).toBe(100_000);
		expect(right.endMs).toBe(region.endMs);
		expect(left.endMs - left.startMs + (right.endMs - right.startMs)).toBe(
			region.endMs - region.startMs,
		);
	});

	it("resumes the right half at the point in the file the cut landed on", () => {
		const region = makeRegion({ startMs: 10_000, sourceStartMs: 5_000 });
		const [left, right] = splitAudioRegion(region, 100_000, makeIdFactory()) as [
			AudioRegion,
			AudioRegion,
		];

		expect(left.sourceStartMs).toBe(5_000);
		// 90s into the region, which itself starts 5s into the file.
		expect(right.sourceStartMs).toBe(95_000);
	});

	it("gives each half a fresh id", () => {
		const region = makeRegion();
		const [left, right] = splitAudioRegion(region, 100_000, makeIdFactory()) as [
			AudioRegion,
			AudioRegion,
		];

		expect(left.id).not.toBe(region.id);
		expect(right.id).not.toBe(region.id);
		expect(left.id).not.toBe(right.id);
	});

	it("refuses to split outside the region", () => {
		const region = makeRegion();
		expect(splitAudioRegion(region, region.startMs, makeIdFactory())).toBeNull();
		expect(splitAudioRegion(region, region.endMs, makeIdFactory())).toBeNull();
		expect(splitAudioRegion(region, 5_000, makeIdFactory())).toBeNull();
	});
});

describe("buildAudioRepeats", () => {
	it("tiles a short clip across a long timeline", () => {
		// 3 minute song, 1 hour timeline: the original plus 19 copies fill it.
		const region = makeRegion({ startMs: 0, endMs: 180_000 });
		const copies = buildAudioRepeats(region, [region], 3_600_000, makeIdFactory());

		expect(copies).toHaveLength(19);
		expect(copies[0].startMs).toBe(180_000);
		expect(copies.at(-1)?.endMs).toBe(3_600_000);
	});

	it("truncates the final copy at the end of the timeline", () => {
		const region = makeRegion({ startMs: 0, endMs: 100 });
		const copies = buildAudioRepeats(region, [region], 250, makeIdFactory());

		expect(copies.map((copy) => [copy.startMs, copy.endMs])).toEqual([
			[100, 200],
			[200, 250],
		]);
	});

	it("carries the source offset onto every copy", () => {
		const region = makeRegion({ startMs: 0, endMs: 1_000, sourceStartMs: 7_000 });
		const copies = buildAudioRepeats(region, [region], 4_000, makeIdFactory());

		expect(copies).toHaveLength(3);
		expect(copies.every((copy) => copy.sourceStartMs === 7_000)).toBe(true);
	});

	it("stops at the first copy that would collide on the same track", () => {
		const region = makeRegion({ id: "a", startMs: 0, endMs: 1_000 });
		const blocker = makeRegion({ id: "b", startMs: 2_500, endMs: 3_000 });
		const copies = buildAudioRepeats(region, [region, blocker], 10_000, makeIdFactory());

		// 1000–2000 fits; the next copy would be 2000–3000, which overlaps the blocker.
		expect(copies).toHaveLength(1);
		expect(copies.at(-1)?.endMs).toBe(2_000);
	});

	it("ignores regions on other tracks", () => {
		const region = makeRegion({ id: "a", startMs: 0, endMs: 1_000, trackIndex: 0 });
		const otherTrack = makeRegion({ id: "b", startMs: 1_000, endMs: 4_000, trackIndex: 1 });
		const copies = buildAudioRepeats(region, [region, otherTrack], 4_000, makeIdFactory());

		expect(copies).toHaveLength(3);
	});

	it("returns nothing when the region already reaches the end", () => {
		const region = makeRegion({ startMs: 0, endMs: 5_000 });
		expect(buildAudioRepeats(region, [region], 5_000, makeIdFactory())).toEqual([]);
	});

	it("caps runaway tiling of very short clips", () => {
		const region = makeRegion({ startMs: 0, endMs: 10 });
		const copies = buildAudioRepeats(region, [region], 10_000_000, makeIdFactory());

		expect(copies).toHaveLength(MAX_AUDIO_REPEAT_COPIES);
	});
});
