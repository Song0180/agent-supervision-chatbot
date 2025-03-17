import { END, StateGraph, START } from '@langchain/langgraph';
import { supervisorChain } from './supervisor';
import { NextRequest, NextResponse } from 'next/server';
import { Message as VercelChatMessage } from 'ai';

import agents, { agentNames, AgentState } from './workers';
import { convertVercelMessageToLangChainMessage } from '@/utils/utils';

const graph = new StateGraph(AgentState).addNode('supervisor', supervisorChain);

agentNames.forEach((name) => {
  graph.addNode(name, agents[name]);
  graph.addEdge(name as any, END);
});

graph.addConditionalEdges('supervisor', (x: typeof AgentState.State) => x.next);

graph.addEdge(START, 'supervisor');

const compiledGraph = graph.compile();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = (body.messages ?? [])
      .filter(
        (message: VercelChatMessage) =>
          message.role === 'user' || message.role === 'assistant'
      )
      .map(convertVercelMessageToLangChainMessage);

    const eventStream = compiledGraph.streamEvents(
      { messages },
      { version: 'v2' }
    );

    const textEncoder = new TextEncoder();
    const transformStream = new ReadableStream({
      async start(controller) {
        for await (const { event, data } of eventStream) {
          if (event === 'on_chat_model_stream') {
            // Intermediate chat model generations will contain tool calls and no content
            if (!!data.chunk.content) {
              controller.enqueue(textEncoder.encode(data.chunk.content));
            }
          }
        }
        controller.close();
      },
    });

    return new Response(transformStream);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
