import { describe, expect, it } from "vitest";

import {
	getScreenSourceIdForDisplay,
	LINUX_PORTAL_SCREEN_SOURCE_ID,
	shouldUseSyntheticLinuxPortalSource,
} from "./sourceMapping";

describe("getScreenSourceIdForDisplay", () => {
	it("keeps the live Electron screen source when one is available", () => {
		expect(
			getScreenSourceIdForDisplay({
				displayId: "42",
				matchedSourceId: "screen:42:0",
				platform: "linux",
			}),
		).toBe("screen:42:0");
	});

	it("routes unmatched Linux Wayland screens through the portal sentinel", () => {
		expect(
			getScreenSourceIdForDisplay({
				displayId: "42",
				env: { XDG_SESSION_TYPE: "wayland", WAYLAND_DISPLAY: "wayland-0" },
				matchedSourceId: null,
				platform: "linux",
			}),
		).toBe(LINUX_PORTAL_SCREEN_SOURCE_ID);
	});

	it("keeps unmatched Linux X11 screens on the explicit fallback id", () => {
		expect(
			getScreenSourceIdForDisplay({
				displayId: "42",
				env: { XDG_SESSION_TYPE: "x11", DISPLAY: ":0" },
				matchedSourceId: null,
				platform: "linux",
			}),
		).toBe("screen:fallback:42");
	});

	it("keeps non-Linux unmatched screens on the explicit fallback id", () => {
		expect(
			getScreenSourceIdForDisplay({
				displayId: "42",
				matchedSourceId: undefined,
				platform: "win32",
			}),
		).toBe("screen:fallback:42");
	});
});

describe("shouldUseSyntheticLinuxPortalSource", () => {
	it("uses the synthetic portal only for Linux Wayland fallback sources", () => {
		expect(
			shouldUseSyntheticLinuxPortalSource({
				env: { XDG_SESSION_TYPE: "wayland", WAYLAND_DISPLAY: "wayland-0" },
				platform: "linux",
				sourceId: LINUX_PORTAL_SCREEN_SOURCE_ID,
			}),
		).toBe(true);
		expect(
			shouldUseSyntheticLinuxPortalSource({
				env: { XDG_SESSION_TYPE: "wayland", WAYLAND_DISPLAY: "wayland-0" },
				platform: "linux",
				sourceId: "screen:fallback:42",
			}),
		).toBe(true);
	});

	it("does not use the synthetic portal on Linux X11", () => {
		expect(
			shouldUseSyntheticLinuxPortalSource({
				env: { XDG_SESSION_TYPE: "x11", DISPLAY: ":0" },
				platform: "linux",
				sourceId: LINUX_PORTAL_SCREEN_SOURCE_ID,
			}),
		).toBe(false);
	});

	it("keeps real desktopCapturer sources out of the synthetic portal path", () => {
		expect(
			shouldUseSyntheticLinuxPortalSource({
				env: { XDG_SESSION_TYPE: "wayland", WAYLAND_DISPLAY: "wayland-0" },
				platform: "linux",
				sourceId: "screen:42:0",
			}),
		).toBe(false);
	});
});
