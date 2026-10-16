import {
  DoorOpen, Car, Lightbulb, Lock, Power, Zap, Music, Sun, Moon, Thermometer, Fan,
  Briefcase, Dumbbell, Backpack, Key, Coffee, Bed, House, Bike, ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  "door-open": DoorOpen,
  home: House,
  briefcase: Briefcase,
  dumbbell: Dumbbell,
  backpack: Backpack,
  bed: Bed,
  coffee: Coffee,
  car: Car,
  bike: Bike,
  key: Key,
  lock: Lock,
  lightbulb: Lightbulb,
  power: Power,
  zap: Zap,
  thermometer: Thermometer,
  fan: Fan,
  music: Music,
  sun: Sun,
  moon: Moon,
  "shopping-bag": ShoppingBag,
};

export const ICON_NAMES = Object.keys(ICONS);
export const iconFor = (name: string): LucideIcon => ICONS[name] ?? Power;
