import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';

describe('Test Setup Verification', () => {
  describe('jsdom environment', () => {
    it('should have access to document', () => {
      expect(document).toBeDefined();
      expect(document.body).toBeDefined();
    });

    it('should have access to window', () => {
      expect(window).toBeDefined();
      expect(window.location).toBeDefined();
    });
  });

  describe('browser API mocks', () => {
    it('should mock matchMedia', () => {
      const mediaQuery = window.matchMedia('(min-width: 768px)');
      expect(mediaQuery).toBeDefined();
      expect(mediaQuery.matches).toBe(false);
      expect(mediaQuery.media).toBe('(min-width: 768px)');
    });

    it('should mock ResizeObserver', () => {
      const observer = new ResizeObserver(() => {});
      expect(observer).toBeDefined();
      expect(observer.observe).toBeDefined();
      expect(observer.unobserve).toBeDefined();
      expect(observer.disconnect).toBeDefined();
    });

    it('should mock IntersectionObserver', () => {
      const observer = new IntersectionObserver(() => {});
      expect(observer).toBeDefined();
      expect(observer.observe).toBeDefined();
      expect(observer.root).toBeNull();
    });
  });

  describe('React Testing Library', () => {
    it('should render a simple component', () => {
      const TestComponent = () => createElement('div', { 'data-testid': 'test' }, 'Hello');
      render(createElement(TestComponent));
      expect(screen.getByTestId('test')).toBeInTheDocument();
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });

  describe('vitest functionality', () => {
    it('should support mocking', () => {
      const mockFn = vi.fn().mockReturnValue(42);
      expect(mockFn()).toBe(42);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should support spying', () => {
      const obj = { method: () => 'original' };
      const spy = vi.spyOn(obj, 'method').mockReturnValue('mocked');
      expect(obj.method()).toBe('mocked');
      expect(spy).toHaveBeenCalled();
    });
  });
});
