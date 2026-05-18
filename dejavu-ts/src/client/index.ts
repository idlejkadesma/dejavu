import { MemoryClient } from "./dejavu";
import type * as MemoryTypes from "./dejavu.types";

// Re-export all types from dejavu.types
export type {
  AddMemoryOptions,
  SearchMemoryOptions,
  GetAllMemoryOptions,
  DeleteAllMemoryOptions,
  ProjectOptions,
  Memory,
  MemoryHistory,
  MemoryUpdateBody,
  ProjectResponse,
  PromptUpdatePayload,
  Webhook,
  WebhookCreatePayload,
  WebhookUpdatePayload,
  Messages,
  Message,
  AllUsers,
  User,
  FeedbackPayload,
  CreateMemoryExportPayload,
  GetMemoryExportPayload,
} from "./dejavu.types";

// Re-export enums as values (not type-only)
export { Feedback, WebhookEvent } from "./dejavu.types";

// Export the main client
export { MemoryClient };
export default MemoryClient;

// Export structured exceptions
export {
  MemoryError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  MemoryNotFoundError,
  NetworkError,
  ConfigurationError,
  MemoryQuotaExceededError,
  createExceptionFromResponse,
} from "../common/exceptions";

export type { MemoryErrorOptions } from "../common/exceptions";
