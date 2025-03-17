import { ReactNode } from 'react';
import { Message } from 'ai/react';
import Markdown from 'react-markdown';
import { Sparkles } from 'lucide-react';

export interface Source {
  pageContent: string;
  metadata?: {
    loc?: { lines?: { from: string; to: string } };
  };
}

interface ChatMessageBubbleProps {
  message: Message;
  sources?: Source[];
  skeleton?: ReactNode;
}

export function ChatMessageBubble({
  message,
  sources,
  skeleton,
}: ChatMessageBubbleProps) {
  const colorClassName =
    message.role === 'user'
      ? 'bg-[#f4f4f4] max-w-[80%] px-4 rounded-xl'
      : 'w-full overflow';

  const alignmentClassName = message.role === 'user' ? 'ml-auto' : 'mr-auto';
  return (
    <div className='flex flex-col gap-2'>
      {message.role !== 'user' && (
        <div className='flex items-center gap-2'>
          <Sparkles className='text-blue-500' />
          <h2 className='font-bold'>AI Assistant</h2>
        </div>
      )}

      <div
        className={`${alignmentClassName} ${colorClassName} px-2 py-2.5 mb-4 flex flex-col gap-2`}
      >
        <div className='whitespace-normal flex flex-col break-word'>
          {skeleton ? skeleton : <Markdown>{message.content}</Markdown>}

          {sources && sources.length ? (
            <>
              <code className='mt-4 mr-auto bg-white px-2 py-1 rounded'>
                <h2>Sources:</h2>
              </code>
              <code className='mt-1 mr-2 bg-slate-600 px-2 py-1 rounded text-xs'>
                {sources?.map((source, i) => (
                  <div className='mt-2' key={'source:' + i}>
                    {i + 1}. &quot;{source.pageContent}&quot;
                    {source.metadata?.loc?.lines !== undefined ? (
                      <div>
                        <br />
                        Lines {source.metadata?.loc?.lines?.from} to{' '}
                        {source.metadata?.loc?.lines?.to}
                      </div>
                    ) : (
                      ''
                    )}
                  </div>
                ))}
              </code>
            </>
          ) : (
            ''
          )}
        </div>
      </div>
    </div>
  );
}
