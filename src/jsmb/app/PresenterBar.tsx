import type { ReactNode } from "react";
import { Presentation, X } from "lucide-react";
import { cn } from "../ui/cn";
import { EYEBROW, IconButton } from "../ui";
import { useUiStore } from "../store/uiStore";

export interface PresenterBarProps {
  /**
   * SEAM (wave 3): the architect mounts the scenario launcher, playback
   * transport and speed control from `features/presenter/**` here. The bar
   * owns the frame, the height and the mobile behaviour; the contents are
   * entirely wave 3's.
   */
  children?: ReactNode;
  className?: string;
}

/**
 * Bottom rail shown while presenter mode is on. It reserves real layout space
 * (the shell pads for it) rather than floating over the content, because the
 * presenter uses it while reading the numbers above it.
 */
export function PresenterBar({ children, className }: PresenterBarProps) {
  const togglePresenterMode = useUiStore((s) => s.togglePresenterMode);

  return (
    <div
      role="region"
      aria-label="Presenter controls"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-j-console-line bg-j-console/95 backdrop-blur",
        "text-j-console-ink",
        className,
      )}
    >
      <div className="flex min-h-[3.5rem] items-center gap-3 px-3 py-2 sm:px-4">
        <span className="flex shrink-0 items-center gap-2">
          <Presentation className="h-4 w-4 text-j-primary-bright" aria-hidden="true" />
          <span className={cn(EYEBROW, "hidden text-j-console-ink-2/70 sm:inline")}>Presenter</span>
        </span>

        <div className="j-scroll flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {children ?? (
            <p className="text-[13px] text-j-console-ink-2">
              Scenario controls mount here.
            </p>
          )}
        </div>

        <IconButton
          label="Exit presenter mode"
          icon={<X />}
          size="sm"
          surface="console"
          onClick={togglePresenterMode}
        />
      </div>
    </div>
  );
}

/** Height the shell reserves at the bottom while the presenter bar is up. */
export const PRESENTER_BAR_HEIGHT = "pb-[4.5rem]";
