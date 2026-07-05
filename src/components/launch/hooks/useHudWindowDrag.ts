import { type PointerEvent, useCallback, useRef } from "react";

// Drags the whole HUD window by streaming screen-space pointer positions to the
// main process ("hud-overlay-drag" -> BrowserWindow.setBounds). Used on Linux,
// where compositors don't reliably honour -webkit-app-region: drag for a
// frameless, non-focusable, always-on-top overlay.
export function useHudWindowDrag() {
	const dragPointerIdRef = useRef<number | null>(null);

	const handleWindowDragPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) {
			return;
		}

		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragPointerIdRef.current = event.pointerId;
		window.electronAPI?.hudOverlayDrag?.("start", event.screenX, event.screenY);
	}, []);

	const handleWindowDragPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
		if (dragPointerIdRef.current !== event.pointerId) {
			return;
		}

		window.electronAPI?.hudOverlayDrag?.("move", event.screenX, event.screenY);
	}, []);

	const handleWindowDragPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
		if (dragPointerIdRef.current !== event.pointerId) {
			return;
		}

		dragPointerIdRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		window.electronAPI?.hudOverlayDrag?.("end", event.screenX, event.screenY);
	}, []);

	return {
		handleWindowDragPointerDown,
		handleWindowDragPointerMove,
		handleWindowDragPointerUp,
	};
}
