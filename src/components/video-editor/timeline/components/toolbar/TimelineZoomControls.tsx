import {
	ArrowsOutLineHorizontal,
	MagnifyingGlassMinus,
	MagnifyingGlassPlus,
} from "@phosphor-icons/react";

interface TimelineZoomControlsProps {
	zoomFactor: number;
	canZoomIn: boolean;
	canZoomOut: boolean;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onFit: () => void;
}

function formatZoomFactor(factor: number): string {
	if (factor < 10) return `${factor.toFixed(1)}×`;
	return `${Math.round(factor)}×`;
}

/**
 * Floating pill anchored inside the timeline viewport. Surfaces the horizontal
 * zoom that was previously only reachable via ctrl+scroll.
 */
export default function TimelineZoomControls({
	zoomFactor,
	canZoomIn,
	canZoomOut,
	onZoomIn,
	onZoomOut,
	onFit,
}: TimelineZoomControlsProps) {
	const buttonClass =
		"inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-35";

	return (
		<div className="absolute bottom-2 right-3 z-50 flex items-center gap-0.5 rounded-full border border-foreground/10 bg-editor-surface/95 px-1 py-1 shadow-[0_8px_20px_rgba(0,0,0,0.18)] backdrop-blur-sm">
			<button
				type="button"
				onClick={onZoomOut}
				disabled={!canZoomOut}
				className={buttonClass}
				title="Zoom out (-)"
				aria-label="Zoom timeline out"
			>
				<MagnifyingGlassMinus className="h-3.5 w-3.5" />
			</button>
			<span className="min-w-[3.25rem] select-none text-center text-[10px] font-medium tabular-nums text-muted-foreground">
				{formatZoomFactor(zoomFactor)}
			</span>
			<button
				type="button"
				onClick={onZoomIn}
				disabled={!canZoomIn}
				className={buttonClass}
				title="Zoom in (+)"
				aria-label="Zoom timeline in"
			>
				<MagnifyingGlassPlus className="h-3.5 w-3.5" />
			</button>
			<div className="mx-0.5 h-3.5 w-px bg-foreground/10" />
			<button
				type="button"
				onClick={onFit}
				disabled={!canZoomOut}
				className={buttonClass}
				title="Fit timeline (0)"
				aria-label="Fit timeline to window"
			>
				<ArrowsOutLineHorizontal className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
