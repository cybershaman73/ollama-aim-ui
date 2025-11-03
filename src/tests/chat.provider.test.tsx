/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import ChatProvider from '../context/ChatProvider';
import { useChat } from '../context/ChatContext';
import hypercycle from 'hypercyclejs';

// Mock the hypercycle module
vi.mock('hypercyclejs', () => ({
  default: {
    aimFetch: vi.fn(),
  },
}));

// Mock useAccount from wagmi
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x123456789',
  }),
}));

// Sample Stream Reader implementation for testing
class MockReadableStream {
  private chunks: Array<Uint8Array>;
  private index: number = 0;
  
  constructor(chunks: Array<string>) {
    this.chunks = chunks.map(chunk => new TextEncoder().encode(chunk));
  }
  
  getReader() {
    return {
      read: async () => {
        if (this.index < this.chunks.length) {
          return { done: false, value: this.chunks[this.index++] };
        }
        return { done: true, value: undefined };
      }
    };
  }
}

describe('ChatProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock for hypercycle.aimFetch
    (hypercycle.aimFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        token: 'test-token',
        status: 'success'
      })
    });
    
    // Setup mock for fetch to return a readable stream
    (global.fetch as any) = vi.fn().mockResolvedValue({
      body: new MockReadableStream([
        'data: {"token": "Hello, "}\n',
        'data: {"token": "World!"}\n',
        'data: {"done": true}\n'
      ])
    });
  });

  it('should add messages and handle streaming responses', async () => {
    // Create a test component that uses the chat context
    const TestComponent = () => {
      const { messages, addMessage } = useChat();
      
      return (
        <div>
          <button 
            onClick={() => addMessage('Hello')}
            data-testid="send-button"
          >
            Send
          </button>
          <div data-testid="message-count">{messages.length}</div>
          {messages.map((msg, idx) => (
            <div key={idx} data-testid={`message-${idx}`}>
              {msg.content}
            </div>
          ))}
        </div>
      );
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Initially there should be no messages
    expect(screen.getByTestId('message-count').textContent).toBe('0');

    // Send a message
    await act(async () => {
      screen.getByTestId('send-button').click();
    });

    // Wait for the streaming to complete
    await waitFor(() => {
      const count = screen.getByTestId('message-count').textContent;
      return Number(count) === 2;
    }, { timeout: 3000 });

    // Should have 2 messages now (user message and AI response)
    expect(screen.getByTestId('message-count').textContent).toBe('2');
    
    // Check user message
    expect(screen.getByTestId('message-0').textContent).toBe('Hello');
    
    // Check AI response
    expect(screen.getByTestId('message-1').textContent).toBe('Hello, World!');
  });
});