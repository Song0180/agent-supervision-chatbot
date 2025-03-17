import { useState } from 'react';
import type { Message } from 'ai/react';

export function IntermediateStep(props: { message: Message }) {
  const parsedInput = JSON.parse(props.message.content);
  const action = parsedInput.action;
  const observation = parsedInput.observation;
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`mr-auto bg-white border rounded-bl-[20px] rounded-br-[20px] rounded-tr-[20px] px-4 py-2 max-w-[80%] mb-8 whitespace-pre-wrap flex flex-col cursor-pointer`}
    >
      <div
        className={`text-right ${expanded ? 'w-full' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <code className='mr-2 px-2 py-1 rounded hover:text-blue-600'>
          🛠️ <b>{action.name}</b>
        </code>
        <span className={expanded ? 'hidden' : ''}>🔽</span>
        <span className={expanded ? '' : 'hidden'}>🔼</span>
      </div>
      <div
        className={`overflow-hidden max-h-[0px] transition-[max-height] ease-in-out ${
          expanded ? 'max-h-[360px]' : ''
        }`}
      >
        <div
          className={`rounded p-4 mt-1 max-w-0 border ${
            expanded ? 'max-w-full' : 'transition-[max-width] delay-100'
          }`}
        >
          <code
            className={`opacity-0 max-h-[100px] overflow-auto transition ease-in-out delay-150 ${
              expanded ? 'opacity-100' : ''
            }`}
          >
            Tool Input:
            <br></br>
            <br></br>
            {JSON.stringify(action.args)}
          </code>
        </div>
        <div
          className={`rounded p-4 mt-1 max-w-0 border ${
            expanded ? 'max-w-full' : 'transition-[max-width] delay-100'
          }`}
        >
          <code
            className={`opacity-0 max-h-[260px] overflow-auto transition ease-in-out delay-150 ${
              expanded ? 'opacity-100' : ''
            }`}
          >
            {observation}
          </code>
        </div>
      </div>
    </div>
  );
}
