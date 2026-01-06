/**
 * AvatarContextMenu Component Tests
 * Tests for Phase 8.7 AvatarContextMenu (CTX-001 to CTX-013)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarContextMenu } from '@/features/participant/components/AvatarContextMenu';

// Mock avatar child component
function MockAvatar({ label }: { label: string }) {
  return <button data-testid="mock-avatar">{label}</button>;
}

describe('AvatarContextMenu', () => {
  const defaultProps = {
    user: { alias: 'John Smith', is_admin: false },
    isCurrentUser: false,
    isCurrentUserAdmin: false,
    onFilterByUser: vi.fn(),
    onMakeAdmin: vi.fn(),
    onEditAlias: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to open context menu via right-click
  async function openContextMenu() {
    const user = userEvent.setup();
    const trigger = screen.getByTestId('mock-avatar');
    await user.pointer({ keys: '[MouseRight]', target: trigger });
  }

  // CTX-001: Right-click opens context menu
  describe('CTX-001: Right-click opens context menu', () => {
    it('should open context menu on right-click', async () => {
      render(
        <AvatarContextMenu {...defaultProps}>
          <MockAvatar label="JS" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-menu')).toBeInTheDocument();
      });
    });
  });

  // CTX-002: Menu shows user name header
  describe('CTX-002: Menu shows user name header', () => {
    it('should display user alias in menu header', async () => {
      render(
        <AvatarContextMenu {...defaultProps} user={{ alias: 'Alice Wonderland', is_admin: false }}>
          <MockAvatar label="AW" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-menu-label')).toHaveTextContent(
          'Alice Wonderland'
        );
      });
    });
  });

  // CTX-003: Admin star shown for admins
  describe('CTX-003: Admin star shown for admins', () => {
    it('should show star indicator for admin users', async () => {
      render(
        <AvatarContextMenu {...defaultProps} user={{ alias: 'Admin User', is_admin: true }}>
          <MockAvatar label="AU" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        const label = screen.getByTestId('avatar-context-menu-label');
        expect(label).toHaveTextContent('★');
      });
    });

    it('should not show star for non-admin users', async () => {
      render(
        <AvatarContextMenu {...defaultProps} user={{ alias: 'Regular User', is_admin: false }}>
          <MockAvatar label="RU" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        const label = screen.getByTestId('avatar-context-menu-label');
        expect(label).not.toHaveTextContent('★');
      });
    });
  });

  // CTX-004: "(You)" shown for current user
  describe('CTX-004: (You) indicator for current user', () => {
    it('should show (You) for current user', async () => {
      render(
        <AvatarContextMenu {...defaultProps} isCurrentUser={true}>
          <MockAvatar label="JS" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        const label = screen.getByTestId('avatar-context-menu-label');
        expect(label).toHaveTextContent('(You)');
      });
    });

    it('should not show (You) for other users', async () => {
      render(
        <AvatarContextMenu {...defaultProps} isCurrentUser={false}>
          <MockAvatar label="JS" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        const label = screen.getByTestId('avatar-context-menu-label');
        expect(label).not.toHaveTextContent('(You)');
      });
    });
  });

  // CTX-005: "Filter by cards" always visible
  describe('CTX-005: Filter option always visible', () => {
    it('should show filter option for current user', async () => {
      render(
        <AvatarContextMenu {...defaultProps} isCurrentUser={true}>
          <MockAvatar label="JS" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-filter')).toBeInTheDocument();
      });
    });

    it('should show filter option for other users', async () => {
      render(
        <AvatarContextMenu {...defaultProps} isCurrentUser={false}>
          <MockAvatar label="JS" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-filter')).toBeInTheDocument();
      });
    });

    it('should call onFilterByUser when filter option clicked', async () => {
      const user = userEvent.setup();
      const onFilterByUser = vi.fn();
      render(
        <AvatarContextMenu {...defaultProps} onFilterByUser={onFilterByUser}>
          <MockAvatar label="JS" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-filter')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('avatar-context-filter'));
      expect(onFilterByUser).toHaveBeenCalledWith('John Smith');
    });
  });

  // CTX-006: "Edit my alias" on own avatar only
  describe('CTX-006: Edit alias on own avatar only', () => {
    it('should show edit alias option for current user', async () => {
      render(
        <AvatarContextMenu {...defaultProps} isCurrentUser={true}>
          <MockAvatar label="JS" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-edit-alias')).toBeInTheDocument();
      });
    });

    it('should NOT show edit alias option for other users', async () => {
      render(
        <AvatarContextMenu {...defaultProps} isCurrentUser={false}>
          <MockAvatar label="JS" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-menu')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('avatar-context-edit-alias')).not.toBeInTheDocument();
    });

    it('should call onEditAlias when edit option clicked', async () => {
      const user = userEvent.setup();
      const onEditAlias = vi.fn();
      render(
        <AvatarContextMenu {...defaultProps} isCurrentUser={true} onEditAlias={onEditAlias}>
          <MockAvatar label="JS" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-edit-alias')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('avatar-context-edit-alias'));
      expect(onEditAlias).toHaveBeenCalledTimes(1);
    });
  });

  // CTX-007: "Make Admin" for admin viewing non-admin
  describe('CTX-007: Make Admin option visibility', () => {
    it('should show Make Admin when admin views non-admin other user', async () => {
      render(
        <AvatarContextMenu
          {...defaultProps}
          user={{ alias: 'Regular User', is_admin: false }}
          isCurrentUser={false}
          isCurrentUserAdmin={true}
        >
          <MockAvatar label="RU" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-make-admin')).toBeInTheDocument();
      });
    });
  });

  // CTX-008: "Make Admin" hidden for non-admins
  describe('CTX-008: Make Admin hidden for non-admins', () => {
    it('should NOT show Make Admin when non-admin views other user', async () => {
      render(
        <AvatarContextMenu
          {...defaultProps}
          user={{ alias: 'Another User', is_admin: false }}
          isCurrentUser={false}
          isCurrentUserAdmin={false}
        >
          <MockAvatar label="AU" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-menu')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('avatar-context-make-admin')).not.toBeInTheDocument();
    });
  });

  // CTX-009: "Make Admin" hidden when viewing admin
  describe('CTX-009: Make Admin hidden when viewing admin', () => {
    it('should NOT show Make Admin when viewing an admin user', async () => {
      render(
        <AvatarContextMenu
          {...defaultProps}
          user={{ alias: 'Admin User', is_admin: true }}
          isCurrentUser={false}
          isCurrentUserAdmin={true}
        >
          <MockAvatar label="AU" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-menu')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('avatar-context-make-admin')).not.toBeInTheDocument();
    });

    it('should NOT show Make Admin on own avatar', async () => {
      render(
        <AvatarContextMenu
          {...defaultProps}
          user={{ alias: 'Self', is_admin: false }}
          isCurrentUser={true}
          isCurrentUserAdmin={true}
        >
          <MockAvatar label="S" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-menu')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('avatar-context-make-admin')).not.toBeInTheDocument();
    });
  });

  // CTX-010: Make Admin promotes user (callback test)
  describe('CTX-010: Make Admin callback', () => {
    it('should call onMakeAdmin with alias when clicked', async () => {
      const user = userEvent.setup();
      const onMakeAdmin = vi.fn();
      render(
        <AvatarContextMenu
          {...defaultProps}
          user={{ alias: 'Bob Builder', is_admin: false }}
          isCurrentUser={false}
          isCurrentUserAdmin={true}
          onMakeAdmin={onMakeAdmin}
        >
          <MockAvatar label="BB" />
        </AvatarContextMenu>
      );

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId('avatar-context-make-admin')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('avatar-context-make-admin'));
      expect(onMakeAdmin).toHaveBeenCalledWith('Bob Builder');
    });
  });
});
