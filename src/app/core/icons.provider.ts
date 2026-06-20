import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule, LayoutDashboard, MessageCircleQuestion, Gamepad2, Clock, HeartPulse, MessageSquare, Cpu, HardDrive, Table, Tag, MessageCircle, Video, ShoppingCart, GraduationCap, LibraryBig, Megaphone, DownloadCloud, Rocket, Wallet, Repeat, CircuitBoard, Library, Microscope, Users, BookOpen, Zap, Bell, Settings, ShieldCheck, LogOut, X, GripVertical, Pin, PinOff, Menu, SlidersHorizontal, Minimize2, LayoutPanelLeft } from 'lucide-angular';

export const provideLucideIcons = () => {
  return importProvidersFrom(
    LucideAngularModule.pick({
      LayoutDashboard,
      MessageCircleQuestion,
      Gamepad2,
      Clock,
      HeartPulse,
      MessageSquare,
      Cpu,
      HardDrive,
      Table,
      Tag,
      MessageCircle,
      Video,
      ShoppingCart,
      GraduationCap,
      LibraryBig,
      Megaphone,
      DownloadCloud,
      Rocket,
      Wallet,
      Repeat,
      CircuitBoard,
      Library,
      Microscope,
      Users,
      BookOpen,
      Zap,
      Bell,
      Settings,
      ShieldCheck,
      LogOut,
      X,
      GripVertical,
      Pin,
      PinOff,
      Menu,
      SlidersHorizontal,
      Minimize2,
      LayoutPanelLeft
    })
  );
};
