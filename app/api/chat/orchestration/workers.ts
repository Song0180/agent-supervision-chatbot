import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent, ToolNode } from '@langchain/langgraph/prebuilt';

import {
  Annotation,
  BinaryOperatorAggregate,
  END,
  Messages,
  StateType,
} from '@langchain/langgraph';
import { RunnableConfig, RunnableToolLike } from '@langchain/core/runnables';
import { StructuredToolInterface } from '@langchain/core/tools';
import { ZodAny, ZodObject } from 'zod';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { WorkerConfig } from '@/types/agentConfig.type';
import ConfigLoader from '@/utils/agentConfigLoader';
import { Calculator } from '@langchain/community/tools/calculator';
import { WikipediaQueryRun } from '@langchain/community/tools/wikipedia_query_run';

// This defines the object that is passed between each node
// in the graph. We will create different nodes for each agent and tool
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (currentMessages, newMessages) =>
      currentMessages.concat(newMessages),
    default: () => [],
  }),
  // The agent node that last performed work
  next: Annotation<string>({
    reducer: (currentNode, nextNode) => nextNode ?? currentNode ?? END,
    default: () => END,
  }),
});

type AgentNode = (
  state: typeof AgentState.State,
  config?: RunnableConfig
) => Promise<{
  messages: HumanMessage[];
}>;

const getToolsFromConfig = (toolsConfig: string[]) => {
  const tools:
    | ToolNode<
        StateType<{
          messages: BinaryOperatorAggregate<BaseMessage[], Messages>;
        }>
      >
    | (
        | StructuredToolInterface<
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ZodObject<any, any, any, any, { [x: string]: any }>
          >
        | RunnableToolLike<ZodAny>
      )[] = [];

  toolsConfig.forEach((tool) => {
    if (tool.includes('tavily')) {
      tools.push(new TavilySearchResults({ maxResults: 1 }));
    } else if (tool.includes('calculator')) {
      tools.push(new Calculator());
    } else if (tool.includes('wikipedia')) {
      tools.push(
        new WikipediaQueryRun({
          topKResults: 3,
          maxDocContentLength: 4000,
        })
      );
    }
  });

  return tools;
};

const createWorkerAgent = (workerConfig: WorkerConfig) => {
  let llm;

  if (workerConfig.llmProvider === 'OPENAI') {
    llm = new ChatOpenAI({
      modelName: workerConfig.model,
      temperature: workerConfig.temperature,
    });
  } else {
    throw new Error(`Unsupported LLM provider: ${workerConfig.llmProvider}`);
  }

  const tools = getToolsFromConfig(workerConfig.tools);

  const agent = createReactAgent({
    llm,
    tools,
    messageModifier: new SystemMessage(workerConfig.systemMessage),
  });

  const agentNode = async (
    state: typeof AgentState.State,
    config?: RunnableConfig
  ) => {
    const result = await agent.invoke(state, config);
    const lastMessage = result.messages[result.messages.length - 1];
    return {
      messages: [
        new HumanMessage({
          content: lastMessage.content,
          name: workerConfig.name,
        }),
      ],
    };
  };

  return agentNode;
};

const createAgentsFromConfig = () => {
  const config = ConfigLoader.getConfig();
  const agents: Record<string, AgentNode> = {};

  config.workers.forEach((workerConfig) => {
    const agentNode = createWorkerAgent(workerConfig);
    agents[workerConfig.name] = agentNode;
  });

  return agents;
};

const agents = createAgentsFromConfig();

export const agentNames = Object.keys(agents);

export default agents;
