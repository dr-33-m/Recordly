import { describe, expect, it } from "vitest";

import { resolveTimelineWheelPanDeltaPx, zoomRangeAroundAnchor } from "./useTimelineRange";

describe("zoomRangeAroundAnchor", () => {
	const HOUR_MS = 3_600_000;
	const config = { totalMs: HOUR_MS, minVisibleRangeMs: 300 };

	it("shrinks the visible span by the zoom factor", () => {
		const zoomed = zoomRangeAroundAnchor({ start: 0, end: HOUR_MS }, 2, HOUR_MS / 2, config);
		expect(zoomed.end - zoomed.start).toBeCloseTo(HOUR_MS / 2, 0);
	});

	it("keeps the anchor at the same relative viewport position", () => {
		// Anchor sits 25% into the viewport; it should stay 25% in after zooming.
		const before = { start: 0, end: 1000 };
		const anchorMs = 250;
		const zoomed = zoomRangeAroundAnchor(before, 2, anchorMs, {
			totalMs: 10_000,
			minVisibleRangeMs: 100,
		});
		const ratio = (anchorMs - zoomed.start) / (zoomed.end - zoomed.start);
		expect(ratio).toBeCloseTo(0.25, 5);
	});

	it("never zooms in past the minimum visible range", () => {
		const zoomed = zoomRangeAroundAnchor({ start: 0, end: 400 }, 1000, 200, config);
		expect(zoomed.end - zoomed.start).toBe(300);
	});

	it("caps a zoom-out that would exceed the timeline at the full range", () => {
		// 1s window zoomed out 100000x would be ~28 hours; it should stop at 1 hour.
		const zoomed = zoomRangeAroundAnchor({ start: 1000, end: 2000 }, 0.00001, 1500, config);
		expect(zoomed.start).toBe(0);
		expect(zoomed.end).toBe(HOUR_MS);
	});

	it("zooms out to exactly the requested span when it still fits", () => {
		const zoomed = zoomRangeAroundAnchor({ start: 1000, end: 2000 }, 0.001, 1500, config);
		expect(zoomed.end - zoomed.start).toBe(1_000_000);
	});

	it("keeps the range inside the timeline when the anchor is at the end", () => {
		const zoomed = zoomRangeAroundAnchor({ start: 0, end: HOUR_MS }, 4, HOUR_MS, config);
		expect(zoomed.start).toBeGreaterThanOrEqual(0);
		expect(zoomed.end).toBeLessThanOrEqual(HOUR_MS);
	});
});

describe("resolveTimelineWheelPanDeltaPx", () => {
	it("uses trackpad horizontal wheel movement for timeline panning", () => {
		expect(
			resolveTimelineWheelPanDeltaPx({
				deltaX: 24,
				deltaY: 0,
				deltaMode: 0,
			}),
		).toBe(24);
	});

	it("uses shifted vertical wheel movement for timeline panning", () => {
		expect(
			resolveTimelineWheelPanDeltaPx({
				deltaX: 0,
				deltaY: 3,
				deltaMode: 1,
				shiftKey: true,
			}),
		).toBe(48);
	});

	it("keeps ctrl wheel available for timeline zoom unless shift is also held", () => {
		expect(
			resolveTimelineWheelPanDeltaPx({
				deltaX: 0,
				deltaY: 3,
				deltaMode: 1,
				ctrlKey: true,
			}),
		).toBe(0);
		expect(
			resolveTimelineWheelPanDeltaPx({
				deltaX: 0,
				deltaY: 3,
				deltaMode: 1,
				ctrlKey: true,
				shiftKey: true,
			}),
		).toBe(48);
	});

	it("uses regular wheel movement when the timeline has no vertical overflow", () => {
		expect(
			resolveTimelineWheelPanDeltaPx({
				deltaX: 0,
				deltaY: 20,
				deltaMode: 0,
				canScrollVertically: false,
			}),
		).toBe(20);
	});
});
