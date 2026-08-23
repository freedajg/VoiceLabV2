import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";
import { chrome, focusRing, toneClasses, type Surface, type Tone } from "./tokens";

export type ButtonVariant = "solid" | "soft" | "outline" | "ghost";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const SIZES: Record<ButtonSize, string> = {
  xs: "h-7 gap-1.5 px-2.5 text-xs rounded-lg",
  sm: "h-9 gap-1.5 px-3 text-[13px] rounded-lg",
  md: "h-11 gap-2 px-4 text-sm rounded-xl",
  lg: "h-12 gap-2.5 px-6 text-base rounded-xl",
};

const ICON_BOX: Record<ButtonSize, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-[18px] w-[18px]",
  lg: "h-5 w-5",
};

/** Forces whatever icon the caller passes to the button's own icon size. */
const ICON_FIT = "inline-flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full";

function variantClasses(
  variant: ButtonVariant,
  tone: Tone,
  surface: Surface,
): string {
  const t = toneClasses(tone, surface);
  switch (variant) {
    case "solid":
      return t.solid;
    case "soft":
      return t.soft;
    case "outline":
      return cn("border bg-transparent", t.border, t.text, t.hoverSoft);
    case "ghost":
      return cn("bg-transparent", t.text, t.hoverSoft);
  }
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  variant?: ButtonVariant;
  size?: ButtonSize;
  surface?: Surface;
  /** Stretch to the container — the default shape for mobile checkout CTAs. */
  block?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

/**
 * The one button. Always a real `<button>`, never a styled div, so keyboard
 * and screen-reader behaviour comes for free.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    tone = "neutral",
    variant = "solid",
    size = "md",
    surface = "product",
    block = false,
    loading = false,
    iconLeft,
    iconRight,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  const box = ICON_BOX[size];
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-semibold",
        "transition-colors duration-150",
        "disabled:pointer-events-none disabled:opacity-45",
        SIZES[size],
        variantClasses(variant, tone, surface),
        variant === "ghost" && tone === "neutral" && chrome(surface).ink2,
        block && "w-full",
        focusRing(surface),
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className={cn(box, "animate-spin")} aria-hidden="true" />
      ) : iconLeft ? (
        <span className={cn(box, ICON_FIT)} aria-hidden="true">
          {iconLeft}
        </span>
      ) : null}
      {children}
      {iconRight ? (
        <span className={cn(box, ICON_FIT)} aria-hidden="true">
          {iconRight}
        </span>
      ) : null}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — becomes the accessible name and the tooltip. */
  label: string;
  icon: ReactNode;
  tone?: Tone;
  variant?: ButtonVariant;
  size?: ButtonSize;
  surface?: Surface;
  round?: boolean;
  /** Toggle-style icon buttons (phone frame, rail, presenter) set this. */
  pressed?: boolean;
}

const ICON_BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: "h-7 w-7 rounded-lg",
  sm: "h-9 w-9 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-xl",
};

/** Square icon-only button. `label` is mandatory; there is no unlabelled path. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    tone = "neutral",
    variant = "ghost",
    size = "md",
    surface = "product",
    round = false,
    pressed,
    className,
    type = "button",
    ...rest
  },
  ref,
) {
  const activeTone: Tone = pressed ? "primary" : tone;
  const activeVariant: ButtonVariant = pressed ? "soft" : variant;

  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-colors duration-150",
        "disabled:pointer-events-none disabled:opacity-45",
        ICON_BUTTON_SIZES[size],
        round && "rounded-full",
        variantClasses(activeVariant, activeTone, surface),
        focusRing(surface),
        className,
      )}
      {...rest}
    >
      <span className={cn(ICON_BOX[size], ICON_FIT)} aria-hidden="true">
        {icon}
      </span>
    </button>
  );
});
