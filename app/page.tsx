import { ChatWindow } from '@/components/ChatWindow';

export default function Home() {
  return (
    <ChatWindow
      endpoint='api/chat/orchestration'
      placeholder='Ask me anything!'
      titleText='Agent Supervision Demo'
    />
  );
}
