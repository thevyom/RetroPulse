import { describe, it, expect } from 'vitest';

describe('Core Dependencies Verification', () => {
  describe('Zustand', () => {
    it('should import create from zustand', async () => {
      const zustand = await import('zustand');
      expect(zustand.create).toBeDefined();
      expect(typeof zustand.create).toBe('function');
    });
  });

  describe('Tailwind + shadcn/ui utilities', () => {
    it('should import cn utility from lib/utils', async () => {
      const { cn } = await import('@/lib/utils');
      expect(cn).toBeDefined();
      expect(typeof cn).toBe('function');
    });

    it('should merge class names correctly', async () => {
      const { cn } = await import('@/lib/utils');
      const result = cn('px-4 py-2', 'px-6', 'bg-red-500');
      expect(result).toContain('px-6');
      expect(result).toContain('py-2');
      expect(result).toContain('bg-red-500');
      expect(result).not.toContain('px-4');
    });

    it('should import clsx', async () => {
      const { clsx } = await import('clsx');
      expect(clsx).toBeDefined();
      expect(clsx('a', 'b', { c: true, d: false })).toBe('a b c');
    });

    it('should import tailwind-merge', async () => {
      const { twMerge } = await import('tailwind-merge');
      expect(twMerge).toBeDefined();
      expect(twMerge('px-4 px-6')).toBe('px-6');
    });

    it('should import class-variance-authority', async () => {
      const { cva } = await import('class-variance-authority');
      expect(cva).toBeDefined();
      expect(typeof cva).toBe('function');
    });
  });

  describe('Lucide Icons', () => {
    it('should import icons from lucide-react', async () => {
      const { Plus, Trash2, X } = await import('lucide-react');
      expect(Plus).toBeDefined();
      expect(Trash2).toBeDefined();
      expect(X).toBeDefined();
    });
  });

  describe('DnD Kit', () => {
    it('should import core DnD functions', async () => {
      const { DndContext, useDraggable, useDroppable } = await import('@dnd-kit/core');
      expect(DndContext).toBeDefined();
      expect(useDraggable).toBeDefined();
      expect(useDroppable).toBeDefined();
    });

    it('should import sortable utilities', async () => {
      const { SortableContext, useSortable } = await import('@dnd-kit/sortable');
      expect(SortableContext).toBeDefined();
      expect(useSortable).toBeDefined();
    });
  });

  describe('Axios', () => {
    it('should import axios', async () => {
      const axios = await import('axios');
      expect(axios.default).toBeDefined();
      expect(axios.default.get).toBeDefined();
      expect(axios.default.post).toBeDefined();
    });
  });

  describe('Socket.io Client', () => {
    it('should import io from socket.io-client', async () => {
      const { io } = await import('socket.io-client');
      expect(io).toBeDefined();
      expect(typeof io).toBe('function');
    });
  });

  describe('Radix UI', () => {
    it('should import Slot from radix-ui', async () => {
      const { Slot } = await import('@radix-ui/react-slot');
      expect(Slot).toBeDefined();
    });
  });
});
