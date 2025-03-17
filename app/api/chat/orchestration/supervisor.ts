import { z } from 'zod';
import { END } from '@langchain/langgraph';
import { JsonOutputToolsParser } from '@langchain/core/output_parsers/openai_tools';
import { ChatOpenAI } from '@langchain/openai';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';

import ConfigLoader from '@/utils/agentConfigLoader';
import { agentNames } from './workers';

const config = ConfigLoader.getConfig();
const members = agentNames;

const systemPrompt =
  'You are a supervisor tasked with managing a conversation between the' +
  ' following workers: {members}. Given the following user request,' +
  ' respond with the worker to act next. Each worker will perform a' +
  ' task and respond with their results and status. When finished,' +
  ' respond with FINISH.';
const options = [END, ...members];

// Define the routing function
const routingTool = {
  name: 'route',
  description: 'Select the next role.',
  schema: z.object({
    next: z.enum([END, ...members]),
  }),
};

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  new MessagesPlaceholder('messages'),
  [
    'system',
    'Given the conversation above, who should act next?' +
      ' Or should we FINISH? Select one of: {options}',
  ],
]);

const formattedPrompt = await prompt.partial({
  options: options.join(', '),
  members: members.join(', '),
});

let llm;

if (config.supervisor.llmProvider === 'OPENAI') {
  llm = new ChatOpenAI({
    modelName: config.supervisor.model,
    temperature: config.supervisor.temperature,
  });
} else {
  throw new Error(`Unsupported LLM provider: ${config.supervisor.llmProvider}`);
}

type RouteToolCall = {
  type: string;
  args: { next: string };
  id: string | number;
};

export const supervisorChain = formattedPrompt
  .pipe(
    llm.bindTools([routingTool], {
      tool_choice: 'route',
    })
  )
  .pipe(new JsonOutputToolsParser())
  // select the 1st one
  .pipe((x: RouteToolCall[]) => {
    if (process.env.NEXT_PUBLIC_ENV === 'local') {
      console.log(x[0].args);
    }
    return x[0].args;
  });
