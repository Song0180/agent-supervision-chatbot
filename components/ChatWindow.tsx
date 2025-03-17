'use client';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useChat } from '@ai-sdk/react';
import { useReducer, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { ChatMessageBubble, Source } from '@/components/ChatMessageBubble';

export function ChatWindow(props: {
  endpoint: string;
  placeholder?: string;
  titleText?: string;
  showIngestForm?: boolean;
}) {
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  const { endpoint, placeholder, titleText = 'An LLM' } = props;

  const [showSkeleton, toggleShowSkeleton] = useReducer((show) => !show, false);

  const [sourcesForMessages, setSourcesForMessages] = useState<
    Record<string, Source[]>
  >({});

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: endpoint,
    onResponse: (response) => {
      toggleShowSkeleton();
      const sourcesHeader = response.headers.get('x-sources');
      const sources = sourcesHeader
        ? JSON.parse(Buffer.from(sourcesHeader, 'base64').toString('utf8'))
        : [];
      const messageIndexHeader = response.headers.get('x-message-index');
      if (sources.length && messageIndexHeader !== null) {
        setSourcesForMessages({
          ...sourcesForMessages,
          [messageIndexHeader]: sources,
        });
      }
    },
    streamProtocol: 'text',
    initialMessages: [
      {
        id: '0',
        content: 'Anything I can help you today?',
        role: 'assistant',
      },
    ],
    onError: (e) => {
      toast(e.message, {
        theme: 'light',
      });
    },
  });

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSubmit(e);
    toggleShowSkeleton();
  }

  return (
    <div className='flex flex-col items-center grow w-full h-[100vh]'>
      <div
        className='flex flex-col items-center w-full h-full transition-[flex-grow] ease-in-out overflow-y-auto'
        ref={messageContainerRef}
      >
        <div className='sticky top-0 p-3 bg-[#fffc] backdrop-saturate-150 backdrop-blur w-full flex items-center justify-center border-b border-slate-200'>
          {titleText && <h2 className='text-2xl font-bold'>{titleText}</h2>}
        </div>
        <div className='flex flex-col-reverse p-8 md:px-0 md:w-[768px] w-full flex-1'>
          {status === 'submitted' && showSkeleton && (
            <ChatMessageBubble
              message={{ id: 'loading', content: '', role: 'assistant' }}
              skeleton={
                <div className='flex flex-col gap-2'>
                  <div className='bg-linear-to-r/shorter from-indigo-500 to-teal-400 animate-pulse rounded-full h-4 w-full' />
                  <div className='bg-linear-to-r/shorter from-indigo-500 to-teal-400 animate-pulse rounded-full h-4 w-full' />
                  <div className='bg-linear-to-r/shorter from-indigo-500 to-teal-400 animate-pulse rounded-full h-4 w-[30%]' />
                </div>
              }
            />
          )}
          {messages.length > 0
            ? [...messages].reverse().map((m, i) => {
                const sourceKey = (messages.length - 1 - i).toString();
                return (
                  <ChatMessageBubble
                    key={m.id}
                    message={m}
                    sources={sourcesForMessages[sourceKey]}
                  />
                );
              })
            : ''}
        </div>
      </div>

      <form onSubmit={sendMessage} className='flex w-full flex-col'>
        <div className='flex bg-white w-full px-4 md:px-0 pb-8 bottom-0 inset-x-0 pt-0 justify-center'>
          <input
            className='w-full bg-white md:w-[768px] text-gray-900 py-4 px-6 rounded-2xl shadow-sm focus:outline-none border border-[#e3e3e3]'
            value={input}
            placeholder={placeholder}
            onChange={handleInputChange}
            autoFocus
          />
        </div>
      </form>
      <ToastContainer />
    </div>
  );
}
