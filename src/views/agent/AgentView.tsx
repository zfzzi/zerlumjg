import type { ReactNode } from "react";

export type AgentViewProps = {
  children: ReactNode;
};

export default function AgentView({
  children,
}: AgentViewProps) {
  return <div className="agent-layout">{children}</div>;
}
