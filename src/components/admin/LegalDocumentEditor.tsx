"use client"

import { useState, useEffect } from "react"
import { SerializedEditorState } from "lexical"
import { Editor } from "@/components/blocks/editor-00/editor"

interface LegalDocumentEditorProps {
  initialContent?: SerializedEditorState
  onChange?: (content: SerializedEditorState) => void
  readOnly?: boolean
}

const defaultInitialValue = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Start writing your legal document here...",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
} as unknown as SerializedEditorState

export function LegalDocumentEditor({
  initialContent,
  onChange,
  readOnly = false,
}: LegalDocumentEditorProps) {
  const [editorState, setEditorState] = useState<SerializedEditorState>(
    initialContent || defaultInitialValue
  )

  useEffect(() => {
    if (initialContent) {
      setEditorState(initialContent)
    }
  }, [initialContent])

  const handleChange = (value: SerializedEditorState) => {
    setEditorState(value)
    onChange?.(value)
  }

  return (
    <div className="space-y-2">
      <Editor
        editorSerializedState={editorState}
        onSerializedChange={handleChange}
      />
    </div>
  )
}
