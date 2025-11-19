/**
 * Create Workflow Page
 * 
 * New workflow creation
 */

'use client';

import { WorkflowEditor } from '../[id]/_components/WorkflowEditor';

export default function CreateWorkflowPage() {
  return (
    <div className="flex flex-col h-full">
      <WorkflowEditor workflowId="create" />
    </div>
  );
}

