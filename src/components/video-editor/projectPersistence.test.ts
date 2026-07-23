import { describe, expect, it } from "vitest";

import { normalizeProjectEditor } from "./projectPersistence";
import { ADVANCED_VERTICAL_PADDING_MAX } from "./types";

describe("normalizeProjectEditor", () => {
	it("preserves the extended advanced vertical padding range", () => {
		const editor = normalizeProjectEditor({
			padding: {
				top: 240,
				bottom: ADVANCED_VERTICAL_PADDING_MAX,
				left: 22,
				right: 22,
				linked: false,
			},
		});

		expect(editor.padding).toMatchObject({
			top: 240,
			bottom: ADVANCED_VERTICAL_PADDING_MAX,
			left: 22,
			right: 22,
			linked: false,
		});
	});

	it("keeps linked padding clamped to the original range", () => {
		const editor = normalizeProjectEditor({
			padding: {
				top: ADVANCED_VERTICAL_PADDING_MAX,
				bottom: ADVANCED_VERTICAL_PADDING_MAX,
				left: ADVANCED_VERTICAL_PADDING_MAX,
				right: ADVANCED_VERTICAL_PADDING_MAX,
				linked: true,
			},
		});

		expect(editor.padding).toMatchObject({
			top: 100,
			bottom: 100,
			left: 100,
			right: 100,
			linked: true,
		});
	});

	describe("audio region source offsets", () => {
		const baseRegion = {
			id: "audio-1",
			startMs: 1_000,
			endMs: 5_000,
			audioPath: "/music/song.mp3",
			volume: 0.8,
			trackIndex: 0,
		};

		it("round-trips the source offset and cached file duration", () => {
			const editor = normalizeProjectEditor({
				audioRegions: [{ ...baseRegion, sourceStartMs: 30_000, sourceDurationMs: 180_000 }],
			});

			expect(editor.audioRegions[0]).toMatchObject({
				sourceStartMs: 30_000,
				sourceDurationMs: 180_000,
			});
		});

		it("loads legacy projects without the new fields as playing from the top", () => {
			const editor = normalizeProjectEditor({ audioRegions: [baseRegion] });

			expect(editor.audioRegions[0].sourceStartMs).toBe(0);
			expect(editor.audioRegions[0].sourceDurationMs).toBeUndefined();
		});

		it("rejects a negative or non-numeric source offset", () => {
			const editor = normalizeProjectEditor({
				audioRegions: [
					{ ...baseRegion, id: "a", sourceStartMs: -500 },
					{ ...baseRegion, id: "b", sourceStartMs: Number.NaN },
				],
			});

			expect(editor.audioRegions.map((region) => region.sourceStartMs)).toEqual([0, 0]);
		});
	});
});
