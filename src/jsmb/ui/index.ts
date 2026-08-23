/**
 * The JSMB primitive kit.
 *
 * Every surface in this app — storefront, admin, command centre, mesh — is
 * built from these. Two rules hold across all of them:
 *
 *   1. `surface="product" | "console"` instead of duplicated components. The
 *      light product world and the dark agent console share one kit.
 *   2. Colour only ever comes from the `j-*` tokens. No raw hex, anywhere,
 *      except the per-agent accents that arrive from `agents/registry`.
 */

export { cn } from "./cn";

export {
  toneClasses,
  chrome,
  focusRing,
  focusRingInset,
  agentStateTone,
  agentStateIsLive,
  AGENT_STATE_LABEL,
  LANE_LABEL,
  LANE_DOT,
  LANE_TEXT,
  LANE_ORDER,
  EYEBROW,
  GUTTER,
} from "./tokens";
export type { Tone, Surface, ToneClasses, SurfaceChrome } from "./tokens";

export { Button, IconButton } from "./Button";
export type { ButtonProps, IconButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Card, CardHeader, CardInteractive } from "./Card";
export type { CardProps, CardHeaderProps, CardPad } from "./Card";

export { Stat, StatGrid, StatCell } from "./Stat";
export type { StatProps, StatDelta, StatSize } from "./Stat";

export { Badge, Pill } from "./Badge";
export type { BadgeProps, PillProps, BadgeSize } from "./Badge";

export { Table, Th, Td, Tr } from "./Table";
export type { TableProps, ThProps, TdProps, SortDirection } from "./Table";

export { Tabs, TabPanel } from "./Tabs";
export type { TabsProps, TabItem, TabPanelProps } from "./Tabs";

export { Modal } from "./Modal";
export type { ModalProps, ModalSize } from "./Modal";

export { Drawer } from "./Drawer";
export type { DrawerProps, DrawerSide } from "./Drawer";

export { useOverlay } from "./overlay";

export { Field, useFieldContext, controlClasses } from "./Field";
export type { FieldProps, FieldContextValue } from "./Field";

export { TextInput, TextArea } from "./TextInput";
export type { TextInputProps, TextAreaProps, InputSize } from "./TextInput";

export { NumberStepper } from "./NumberStepper";
export type { NumberStepperProps } from "./NumberStepper";

export { Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";

export { Toggle } from "./Toggle";
export type { ToggleProps } from "./Toggle";

export { SegmentedControl } from "./SegmentedControl";
export type { SegmentedControlProps, SegmentOption } from "./SegmentedControl";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { ProgressMeter } from "./ProgressMeter";
export type { ProgressMeterProps } from "./ProgressMeter";

export { Sparkline } from "./Sparkline";
export type { SparklineProps } from "./Sparkline";

export { AgentChip, AgentDot } from "./AgentChip";
export type { AgentChipProps, AgentChipSize } from "./AgentChip";

export { Section, PageHeader } from "./Section";
export type { SectionProps, PageHeaderProps, Crumb } from "./Section";

export { DataGridToolbar } from "./DataGridToolbar";
export type { DataGridToolbarProps } from "./DataGridToolbar";

export {
  useChartTheme,
  chartAxisProps,
  chartGridProps,
  ChartTooltip,
  ChartLegend,
  ChartFrame,
} from "./charts";
export type {
  ChartTheme,
  ChartTooltipProps,
  ChartTooltipRow,
  ChartLegendItem,
  ChartFrameProps,
} from "./charts";
