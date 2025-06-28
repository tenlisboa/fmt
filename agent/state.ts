import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { QueryIntent } from "./types";
import { MemberActivity } from "../services";

export const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (messages, newMessages) => [...messages, ...newMessages],
      default: () => []
    }),
    intent: Annotation<QueryIntent>({
      reducer: (intent, newIntent) => newIntent,
      default: () => QueryIntent.UNKNOWN
    }),
    memberName: Annotation<string>({
      reducer: (memberName, newMemberName) => newMemberName,
      default: () => ''
    }),
    memberGithubUsername: Annotation<string>({
      reducer: (memberGithubUsername, newMemberGithubUsername) => newMemberGithubUsername,
      default: () => ''
    }),
    memberJiraUsername: Annotation<string>({
      reducer: (memberJiraUsername, newMemberJiraUsername) => newMemberJiraUsername,
      default: () => ''
    }),
    memberActivity: Annotation<MemberActivity>({
      reducer: (memberActivity, newMemberActivity) => newMemberActivity,
      default: () => ({
        commits: [],
        pullRequests: [],
        issues: [],
        sprintVelocity: 0,
        lastActive: new Date()
      })
    }),
    summary: Annotation<string>({
      reducer: (summary, newSummary) => newSummary,
      default: () => ''
    }),
    error: Annotation<string>({
      reducer: (error, newError) => newError,
      default: () => ''
    })
  })