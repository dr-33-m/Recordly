import { describe, expect, it } from "vitest";

import { getGpuSwitches } from "./gpuSwitches";

describe("getGpuSwitches", () => {
	it("returns only the VAAPI workaround on Linux, without forcing a GL implementation", () => {
		expect(getGpuSwitches("linux")).toEqual({
			disableFeatures: ["VaapiVideoDecoder", "VaapiVideoEncoder"],
		});
	});
});
