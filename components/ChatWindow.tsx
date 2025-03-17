'use client';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useReducer, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { ChatMessageBubble, Source } from '@/components/ChatMessageBubble';
import { IntermediateStep } from '@/components/IntermediateStep';

export function ChatWindow(props: {
  endpoint: string;
  placeholder?: string;
  titleText?: string;
  showIngestForm?: boolean;
  showIntermediateStepsToggle?: boolean;
}) {
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    endpoint,
    placeholder,
    titleText = 'An LLM',
    showIntermediateStepsToggle,
  } = props;

  const [showIntermediateSteps, setShowIntermediateSteps] = useState(false);
  const [intermediateStepsLoading, setIntermediateStepsLoading] =
    useState(false);
  const [showSkeleton, toggleShowSkeleton] = useReducer((show) => !show, false);

  const intemediateStepsToggle = showIntermediateStepsToggle && (
    <div>
      <input
        type='checkbox'
        id='show_intermediate_steps'
        name='show_intermediate_steps'
        checked={showIntermediateSteps}
        onChange={(e) => setShowIntermediateSteps(e.target.checked)}
      />
      <label htmlFor='show_intermediate_steps'> Show intermediate steps</label>
    </div>
  );

  const [sourcesForMessages, setSourcesForMessages] = useState<
    Record<string, Source[]>
  >({});

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    setMessages,
    status,
  } = useChat({
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

    if (intermediateStepsLoading) {
      return;
    }

    if (!showIntermediateSteps) {
      handleSubmit(e);
    } else {
      setIntermediateStepsLoading(true);
      setInput('');
      const messagesWithUserReply = messages.concat({
        id: messages.length.toString(),
        content: input,
        role: 'user',
        parts: [{ type: 'text', text: input }],
      });
      setMessages(messagesWithUserReply);
      const response = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          messages: messagesWithUserReply,
          show_intermediate_steps: true,
        }),
      });
      const json = await response.json();
      setIntermediateStepsLoading(false);
      if (response.status === 200) {
        const responseMessages: UIMessage[] = json.messages;
        // Represent intermediate steps as system messages for display purposes
        const toolCallMessages = responseMessages.filter((responseMessage) => {
          return (
            (responseMessage.role === 'assistant' &&
              !!responseMessage.content.length) ||
            responseMessage.role === 'data'
          );
        });
        const intermediateStepMessages = [];
        for (let i = 0; i < toolCallMessages.length; i += 2) {
          const aiMessage = toolCallMessages[i];
          const toolMessage = toolCallMessages[i + 1];
          intermediateStepMessages.push({
            id: (messagesWithUserReply.length + i / 2).toString(),
            role: 'system' as const,
            content: JSON.stringify({
              action: aiMessage.parts?.[0],
              observation: toolMessage.content,
            }),
            parts: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  action: aiMessage.parts?.[0],
                  observation: toolMessage.content,
                }),
              },
            ],
          });
        }
        const newMessages = messagesWithUserReply;
        for (const message of intermediateStepMessages) {
          newMessages.push(message);
          setMessages([...newMessages]);
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 + Math.random() * 1000)
          );
        }
        setMessages([
          ...newMessages,
          {
            id: newMessages.length.toString(),
            content: responseMessages[responseMessages.length - 1].content,
            role: 'assistant',
          },
        ]);
      } else {
        if (json.error) {
          toast(json.error, {
            theme: 'dark',
          });
          throw new Error(json.error);
        }
      }
    }
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
          {status === 'streaming' && showSkeleton && (
            <ChatMessageBubble
              message={{ id: 'loading', content: '', role: 'assistant' }}
              skeleton={
                <div className='flex flex-col gap-2'>
                  <div className='bg-gradient-to-r from-purple-200 to-blue-200 animate-pulse rounded-full h-4 w-full' />
                  <div className='bg-gradient-to-r from-purple-200 to-blue-200 animate-pulse rounded-full h-4 w-full' />
                  <div className='bg-gradient-to-r from-purple-200 to-blue-200 animate-pulse rounded-full h-4 w-[30%]' />
                </div>
              }
            />
          )}
          {messages.length > 0
            ? [...messages].reverse().map((m, i) => {
                const sourceKey = (messages.length - 1 - i).toString();
                return m.role === 'system' ? (
                  <IntermediateStep key={m.id} message={m}></IntermediateStep>
                ) : (
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
        <div className='flex'>{intemediateStepsToggle}</div>
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
