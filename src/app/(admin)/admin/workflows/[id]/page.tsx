/**
 * Workflow Editor Page
 * 
 * Visual workflow builder with React Flow
 */

'use client';

import { WorkflowEditor } from './_components/WorkflowEditor';

interface PageProps {
  params: {
    id: string;
  };
}

export default function WorkflowEditorPage({ params }: PageProps) {
  const workflowId = params.id;

  return (
    <div className="absolute inset-0 flex flex-col">
      <WorkflowEditor workflowId={workflowId} />
    </div>
  );
}

