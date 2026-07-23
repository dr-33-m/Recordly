import type { ReactNode } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TimelineContextMenuAction {
	id: string;
	label: string;
	icon?: ReactNode;
	destructive?: boolean;
	onSelect: () => void;
}

export interface TimelineContextMenuState {
	/** Viewport coordinates of the originating right-click. */
	x: number;
	y: number;
	actions: TimelineContextMenuAction[];
}

interface TimelineContextMenuProps {
	state: TimelineContextMenuState | null;
	onClose: () => void;
}

/**
 * Right-click menu for timeline blocks and lanes.
 *
 * The project does not depend on `@radix-ui/react-context-menu`, so this drives
 * the existing DropdownMenu from a zero-size trigger pinned at the click point.
 * Radix still gives us focus trapping, Escape and outside-click handling.
 */
export default function TimelineContextMenu({ state, onClose }: TimelineContextMenuProps) {
	return (
		<DropdownMenu
			open={state !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			modal={false}
		>
			<DropdownMenuTrigger asChild>
				<span
					aria-hidden="true"
					className="pointer-events-none fixed h-0 w-0"
					style={{ left: state?.x ?? 0, top: state?.y ?? 0 }}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				sideOffset={2}
				className="min-w-[184px] border-foreground/10 bg-editor-surface-alt"
				onContextMenu={(event) => event.preventDefault()}
			>
				{(state?.actions ?? []).map((action) => (
					<DropdownMenuItem
						key={action.id}
						onClick={() => {
							action.onSelect();
							onClose();
						}}
						className={
							action.destructive
								? "cursor-pointer gap-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300"
								: "cursor-pointer gap-2 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
						}
					>
						{action.icon}
						<span>{action.label}</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
