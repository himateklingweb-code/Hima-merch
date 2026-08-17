import { createElement } from "react";
import { iconFromName } from "@/lib/icons";

/**
 * Renders a department's icon from its stored Lucide name.
 *
 * `createElement` rather than assigning to a capitalised variable and using
 * JSX: the lookup returns a stable reference from a module-level map, but
 * the `<Icon />` form reads as constructing a component on every render and
 * trips React's static-components rule. This says the same thing without
 * needing the rule silenced.
 */
export default function DeptIcon({
  name,
  className,
  size,
  strokeWidth,
}: {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  return createElement(iconFromName(name), { className, size, strokeWidth });
}
