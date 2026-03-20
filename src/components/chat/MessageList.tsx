"use client";

import { UIMessage, isToolOrDynamicToolUIPart, getToolOrDynamicToolName } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

function getToolLabel(toolName: string, args?: Record<string, unknown>): string {
  const fileName = args?.path ? String(args.path).split("/").pop() : null;

  if (toolName === "str_replace_editor") {
    const command = args?.command as string | undefined;
    switch (command) {
      case "create":
        return fileName ? `Creating ${fileName}` : "Creating file";
      case "str_replace":
        return fileName ? `Editing ${fileName}` : "Editing file";
      case "insert":
        return fileName ? `Inserting into ${fileName}` : "Inserting code";
      case "view":
        return fileName ? `Reading ${fileName}` : "Reading file";
      case "undo_edit":
        return fileName ? `Undoing changes to ${fileName}` : "Undoing edit";
      default:
        return fileName ? `Modifying ${fileName}` : "Modifying file";
    }
  }

  if (toolName === "file_manager") {
    const command = args?.command as string | undefined;
    if (command === "rename") return fileName ? `Renaming ${fileName}` : "Renaming file";
    if (command === "delete") return fileName ? `Deleting ${fileName}` : "Deleting file";
    return fileName ? `Managing ${fileName}` : "Managing files";
  }

  return toolName;
}

interface MessageListProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4 shadow-sm">
          <Bot className="h-7 w-7 text-blue-600" />
        </div>
        <p className="text-neutral-900 font-semibold text-lg mb-2">Start a conversation to generate React components</p>
        <p className="text-neutral-500 text-sm max-w-sm">I can help you create buttons, forms, cards, and more</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-6">
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-4",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-lg bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-neutral-700" />
                </div>
              </div>
            )}

            <div className={cn(
              "flex flex-col gap-2 max-w-[85%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-xl px-4 py-3",
                message.role === "user"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-neutral-900 border border-neutral-200 shadow-sm"
              )}>
                <div className="text-sm">
                  {message.parts && message.parts.length > 0 ? (
                    <>
                      {message.parts.map((part: any, partIndex: number) => {
                        if (part.type === "text") {
                          return message.role === "user" ? (
                            <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>
                          ) : (
                            <MarkdownRenderer
                              key={partIndex}
                              content={part.text}
                              className="prose-sm"
                            />
                          );
                        }
                        if (part.type === "reasoning") {
                          return (
                            <div key={partIndex} className="mt-3 p-3 bg-white/50 rounded-md border border-neutral-200">
                              <span className="text-xs font-medium text-neutral-600 block mb-1">Reasoning</span>
                              <span className="text-sm text-neutral-700">{part.reasoning}</span>
                            </div>
                          );
                        }
                        if (isToolOrDynamicToolUIPart(part)) {
                          const toolName = getToolOrDynamicToolName(part);
                          const args = part.input as Record<string, unknown> | undefined;
                          const friendlyLabel = getToolLabel(toolName, args);
                          const isDone = part.state === "output-available";
                          return (
                            <div key={partIndex} className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
                              {isDone ? (
                                <>
                                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                  <span className="text-neutral-700">{friendlyLabel}</span>
                                </>
                              ) : (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                  <span className="text-neutral-700">{friendlyLabel}</span>
                                </>
                              )}
                            </div>
                          );
                        }
                        if (part.type === "source-url" || part.type === "source-document") {
                          return (
                            <div key={partIndex} className="mt-2 text-xs text-neutral-500">
                              Source: {JSON.stringify(part)}
                            </div>
                          );
                        }
                        if (part.type === "step-start") {
                          return partIndex > 0 ? <hr key={partIndex} className="my-3 border-neutral-200" /> : null;
                        }
                        return null;
                      })}
                      {isLoading &&
                        message.role === "assistant" &&
                        messages.indexOf(message) === messages.length - 1 && (
                          <div className="flex items-center gap-2 mt-3 text-neutral-500">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-sm">Generating...</span>
                          </div>
                        )}
                    </>
                  ) : isLoading &&
                    message.role === "assistant" &&
                    messages.indexOf(message) === messages.length - 1 ? (
                    <div className="flex items-center gap-2 text-neutral-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-sm">Generating...</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-lg bg-blue-600 shadow-sm flex items-center justify-center">
                  <User className="h-4.5 w-4.5 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
