import {
  Star,
  Home,
  Globe,
  Briefcase,
  GraduationCap,
  Wrench,
  Megaphone,
  Users,
  Leaf,
  Droplets,
  Recycle,
  BookOpen,
  Camera,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";

/**
 * Department icons are stored in Postgres as a component *name*, since a
 * React component cannot live in a database column. This maps the name back.
 *
 * Anything unrecognised falls back to `Users` rather than crashing the page —
 * an editor typing a bad icon name should cost a nice icon, not the site.
 */
const ICONS: Record<string, LucideIcon> = {
  Star,
  Home,
  Globe,
  Briefcase,
  GraduationCap,
  Wrench,
  Megaphone,
  Users,
  Leaf,
  Droplets,
  Recycle,
  BookOpen,
  Camera,
  HeartHandshake,
};

/** Names an editor can choose from in the dashboard. */
export const ICON_NAMES = Object.keys(ICONS);

export function iconFromName(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Users;
}
