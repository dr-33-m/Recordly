import { type RefObject, useEffect } from "react";
import { matchesShortcut } from "@/lib/shortcuts";
import type { TimelineShortcutBindings } from "../core/timelineTypes";
import { resolveDeleteSelectionTarget } from "./utils/timelineSelectionUtils";

interface UseTimelineKeyboardShortcutsParams {
	isMac: boolean;
	keyShortcuts: TimelineShortcutBindings;
	isTimelineFocusedRef: RefObject<boolean>;
	hasAnyZoomBlocks: boolean;
	activateSelectAllZooms: () => void;
	annotationCount: number;
	selectedKeyframeId: string | null;
	selectedZoomId: string | null;
	selectedClipId?: string | null;
	selectedAnnotationId?: string | null;
	selectedAudioId?: string | null;
	selectedCaptionId?: string | null;
	hasZoomMultiSelection: boolean;
	addKeyframe: () => void;
	handleAddZoom: () => void;
	handleSplitClip: () => void;
	handleAddAnnotation: () => void;
	deleteSelectedKeyframe: () => void;
	deleteSelectedZoom: () => void;
	deleteSelectedClip: () => void;
	deleteSelectedAnnotation: () => void;
	deleteSelectedAudio: () => void;
	deleteSelectedCaption: () => void;
	cycleAnnotationsAtCurrentTime: (backward?: boolean) => boolean;
	duplicateSelectedAudio: () => void;
	zoomTimelineIn: () => void;
	zoomTimelineOut: () => void;
	fitTimelineRange: () => void;
}

export function useTimelineKeyboardShortcuts({
	isMac,
	keyShortcuts,
	isTimelineFocusedRef,
	hasAnyZoomBlocks,
	activateSelectAllZooms,
	annotationCount,
	selectedKeyframeId,
	selectedZoomId,
	selectedClipId,
	selectedAnnotationId,
	selectedAudioId,
	selectedCaptionId,
	hasZoomMultiSelection,
	addKeyframe,
	handleAddZoom,
	handleSplitClip,
	handleAddAnnotation,
	deleteSelectedKeyframe,
	deleteSelectedZoom,
	deleteSelectedClip,
	deleteSelectedAnnotation,
	deleteSelectedAudio,
	deleteSelectedCaption,
	cycleAnnotationsAtCurrentTime,
	duplicateSelectedAudio,
	zoomTimelineIn,
	zoomTimelineOut,
	fitTimelineRange,
}: UseTimelineKeyboardShortcutsParams) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const eventTarget = e.target;
			if (
				eventTarget instanceof HTMLInputElement ||
				eventTarget instanceof HTMLTextAreaElement ||
				eventTarget instanceof HTMLSelectElement ||
				(eventTarget instanceof HTMLElement && eventTarget.isContentEditable)
			) {
				return;
			}

			if (!isTimelineFocusedRef.current) {
				return;
			}

			if (matchesShortcut(e, { key: "a", ctrl: true }, isMac)) {
				if (!hasAnyZoomBlocks) {
					return;
				}
				e.preventDefault();
				activateSelectAllZooms();
				return;
			}

			// Duplicate the selected audio region (Cmd/Ctrl+D).
			if (matchesShortcut(e, { key: "d", ctrl: true }, isMac)) {
				if (selectedAudioId) {
					e.preventDefault();
					duplicateSelectedAudio();
				}
				return;
			}

			// View zoom. Bare keys, so skip when a modifier is held (ctrl+= is the
			// browser/app zoom and ctrl+scroll already handles timeline zoom).
			if (!e.ctrlKey && !e.metaKey && !e.altKey) {
				if (e.key === "+" || e.key === "=") {
					e.preventDefault();
					zoomTimelineIn();
					return;
				}
				if (e.key === "-" || e.key === "_") {
					e.preventDefault();
					zoomTimelineOut();
					return;
				}
				if (e.key === "0") {
					e.preventDefault();
					fitTimelineRange();
					return;
				}
			}

			if (matchesShortcut(e, keyShortcuts.addKeyframe, isMac)) addKeyframe();
			if (matchesShortcut(e, keyShortcuts.addZoom, isMac)) handleAddZoom();
			if (matchesShortcut(e, keyShortcuts.splitClip, isMac)) handleSplitClip();
			if (matchesShortcut(e, keyShortcuts.addAnnotation, isMac)) {
				handleAddAnnotation();
			}

			if (e.key === "Tab" && annotationCount > 0) {
				if (cycleAnnotationsAtCurrentTime(e.shiftKey)) {
					e.preventDefault();
				}
			}

			if (
				e.key === "Delete" ||
				e.key === "Backspace" ||
				matchesShortcut(e, keyShortcuts.deleteSelected, isMac)
			) {
				const target = resolveDeleteSelectionTarget({
					hasZoomMultiSelection,
					selectedKeyframeId,
					selectedZoomId,
					selectedClipId,
					selectedAnnotationId,
					selectedAudioId,
					selectedCaptionId,
				});
				if (target !== "none") {
					e.preventDefault();
				}
				if (target === "keyframe") {
					deleteSelectedKeyframe();
				} else if (target === "zoom") {
					deleteSelectedZoom();
				} else if (target === "clip") {
					deleteSelectedClip();
				} else if (target === "annotation") {
					deleteSelectedAnnotation();
				} else if (target === "audio") {
					deleteSelectedAudio();
				} else if (target === "caption") {
					deleteSelectedCaption();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		activateSelectAllZooms,
		addKeyframe,
		annotationCount,
		cycleAnnotationsAtCurrentTime,
		deleteSelectedAnnotation,
		deleteSelectedAudio,
		deleteSelectedCaption,
		deleteSelectedClip,
		deleteSelectedKeyframe,
		deleteSelectedZoom,
		duplicateSelectedAudio,
		fitTimelineRange,
		handleAddAnnotation,
		handleAddZoom,
		handleSplitClip,
		hasAnyZoomBlocks,
		isMac,
		zoomTimelineIn,
		zoomTimelineOut,
		isTimelineFocusedRef,
		keyShortcuts,
		hasZoomMultiSelection,
		selectedAnnotationId,
		selectedAudioId,
		selectedCaptionId,
		selectedClipId,
		selectedKeyframeId,
		selectedZoomId,
	]);
}
