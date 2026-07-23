import { describe, expect, it } from "vitest";
import { resolveDeleteSelectionTarget, resolveZoomSelection } from "./timelineSelectionUtils";

describe("resolveZoomSelection", () => {
	const orderedIds = ["z1", "z2", "z3", "z4", "z5"];
	const base = {
		orderedIds,
		currentIds: [] as string[],
		primaryId: null as string | null,
		anchorId: null as string | null,
	};

	it("replaces the selection on a plain click", () => {
		const next = resolveZoomSelection({ ...base, currentIds: ["z1", "z2"], targetId: "z4" });

		expect(next).toEqual({ ids: [], anchorId: "z4", primaryId: "z4" });
	});

	it("clears everything when the target is null", () => {
		const next = resolveZoomSelection({
			...base,
			currentIds: ["z1", "z2"],
			anchorId: "z1",
			targetId: null,
		});

		expect(next).toEqual({ ids: [], anchorId: null, primaryId: null });
	});

	it("adds to the selection on ctrl-click", () => {
		const next = resolveZoomSelection({
			...base,
			currentIds: ["z1"],
			targetId: "z3",
			modifiers: { toggle: true },
		});

		expect(next.ids).toEqual(["z1", "z3"]);
		expect(next.primaryId).toBeNull();
	});

	it("removes from the selection on ctrl-clicking an already-selected block", () => {
		const next = resolveZoomSelection({
			...base,
			currentIds: ["z1", "z3"],
			targetId: "z3",
			modifiers: { toggle: true },
		});

		expect(next.ids).toEqual(["z1"]);
	});

	it("keeps an existing single selection when ctrl-clicking a second block", () => {
		const next = resolveZoomSelection({
			...base,
			primaryId: "z2",
			targetId: "z4",
			modifiers: { toggle: true },
		});

		expect(next.ids).toEqual(["z2", "z4"]);
	});

	it("selects an inclusive range on shift-click", () => {
		const next = resolveZoomSelection({
			...base,
			anchorId: "z2",
			targetId: "z4",
			modifiers: { range: true },
		});

		expect(next.ids).toEqual(["z2", "z3", "z4"]);
		expect(next.anchorId).toBe("z2");
	});

	it("selects a range regardless of drag direction", () => {
		const next = resolveZoomSelection({
			...base,
			anchorId: "z4",
			targetId: "z2",
			modifiers: { range: true },
		});

		expect(next.ids).toEqual(["z2", "z3", "z4"]);
	});

	it("falls back to a plain replace when shift-clicking without an anchor", () => {
		const next = resolveZoomSelection({
			...base,
			targetId: "z3",
			modifiers: { range: true },
		});

		expect(next).toEqual({ ids: [], anchorId: "z3", primaryId: "z3" });
	});

	it("falls back to a plain replace when the anchor no longer exists", () => {
		const next = resolveZoomSelection({
			...base,
			anchorId: "deleted",
			targetId: "z3",
			modifiers: { range: true },
		});

		expect(next.primaryId).toBe("z3");
	});
});

describe("timelineSelectionUtils", () => {
	it("treats a zoom multi-selection as a zoom deletion target", () => {
		expect(
			resolveDeleteSelectionTarget({
				hasZoomMultiSelection: true,
				selectedKeyframeId: "kf-1",
				selectedZoomId: "z-1",
				selectedClipId: "c-1",
				selectedAnnotationId: "a-1",
				selectedAudioId: "au-1",
			}),
		).toBe("zoom");
	});

	it("follows selection priority order", () => {
		expect(
			resolveDeleteSelectionTarget({
				hasZoomMultiSelection: false,
				selectedKeyframeId: "kf-1",
				selectedZoomId: "z-1",
			}),
		).toBe("keyframe");
		expect(
			resolveDeleteSelectionTarget({
				hasZoomMultiSelection: false,
				selectedKeyframeId: null,
				selectedZoomId: "z-1",
				selectedClipId: "c-1",
			}),
		).toBe("zoom");
		expect(
			resolveDeleteSelectionTarget({
				hasZoomMultiSelection: false,
				selectedKeyframeId: null,
				selectedZoomId: null,
				selectedClipId: "c-1",
				selectedAnnotationId: "a-1",
			}),
		).toBe("clip");
	});

	it("returns none when nothing is selected", () => {
		expect(
			resolveDeleteSelectionTarget({
				hasZoomMultiSelection: false,
				selectedKeyframeId: null,
				selectedZoomId: null,
			}),
		).toBe("none");
	});
});
