import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChat } from '../context/ChatContext';
import ChatProvider from '../context/ChatProvider';
import React from 'react';

// Mock the hypercycle module
vi.mock('hypercyclejs', () => ({
  default: {
    aimFetch: vi.fn(),
    getNodeInfo: vi.fn(),
  },
}));

// Mock useAccount from wagmi
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x123456789',
  }),
}));

// Mock the fetch function for streaming
global.fetch = vi.fn();

describe('ChatContext', () => {
  it('should throw error when used outside provider', () => {
    // Expect the error to be thrown because we're not wrapping with a provider
    expect(() => {
      renderHook(() => useChat());
    }).toThrow('useChat must be used within a ChatProvider');
  });

  it('should provide chat context values when used with provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ChatProvider>{children}</ChatProvider>
    );

    const { result } = renderHook(() => useChat(), { wrapper });
    

    expect(result.current).toHaveProperty('messages');
    expect(result.current).toHaveProperty('addMessage');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('walletAddress');
    expect(Array.isArray(result.current.messages)).toBe(true);
    expect(typeof result.current.addMessage).toBe('function');
    expect(typeof result.current.isLoading).toBe('boolean');
  });
});