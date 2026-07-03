export interface GpuSwitches {
	useAngle?: string;
	disableFeatures?: string[];
}

export function getGpuSwitches(platform: NodeJS.Platform): GpuSwitches {
	if (platform === "darwin") {
		return {
			useAngle: "metal",
			disableFeatures: ["MacCatapLoopbackAudioForScreenShare"],
		};
	}

	if (platform === "win32") {
		return { useAngle: "d3d11" };
	}

	if (platform === "linux") {
		// Let Chromium pick its default ANGLE backend. Forcing --use-gl=egl
		// breaks GPU init on Electron >= 39 (only ANGLE implementations are
		// allowed), silently dropping the app to software rendering.
		// Disable VAAPI — many distros ship broken drivers that cause
		// "vaInitialize failed" and prevent the renderer from loading.
		return {
			disableFeatures: ["VaapiVideoDecoder", "VaapiVideoEncoder"],
		};
	}

	return {};
}
