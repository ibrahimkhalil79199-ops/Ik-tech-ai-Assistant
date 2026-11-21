import AsyncStorage from './storage';
import { fetch } from 'expo/fetch';
import { auth } from '@/firebase';

export type ChatRole = 'user' | 'assistant';

export interface ChatImage {
  uri: string;
  mimeType?: string;
}

// A PDF, Word file, video or audio file the user attached.
export interface ChatAttachment {
  uri: string;
  name: string;
  mimeType: string;
  // For text and code files: the text inside the file. It is sent to the AI but not shown in the chat.
  text?: string;
  // Web only: key of the copy of the file kept in the browser, so it can still be opened after a reload.
  fileKey?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  image?: ChatImage;
  attachment?: ChatAttachment;
  // More pictures / files sent together with the first one in the same message.
  extraImages?: ChatImage[];
  extraAttachments?: ChatAttachment[];
  // Parts made when the user asks the app to split a file.
  splitFiles?: any[];
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'ik-tech-ai:history:v1';

// The app sends extra pictures/files as small turns that start with this text (see index.tsx).
const EXTRA_ITEM_MARK = 'Attached item ';
// Everything sent in one request (base64 text) must stay below this size, or the AI refuses it.
const MAX_MEDIA_CHARS = 19_000_000;
// How long to wait for the AI to start answering.
const RESPONSE_TIMEOUT_MS = 90_000;

let messageCounter = 0;

export function generateMessageId(): string {
  messageCounter += 1;
  return `${Date.now()}-${messageCounter}`;
}

export function createConversation(
  title = 'New Chat',
): ChatConversation {
  const now = Date.now();

  return {
    id: `chat-${now}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/* --------------------------------
   HISTORY
--------------------------------- */

export async function loadHistory(): Promise<
  ChatConversation[]
> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed as ChatConversation[];
  } catch {
    return [];
  }
}

export async function saveConversation(
  conversation: ChatConversation,
): Promise<void> {
  const history = await loadHistory();

  const exists = history.some(
    (item) => item.id === conversation.id,
  );

  const updatedHistory = exists
    ? history.map((item) =>
        item.id === conversation.id
          ? conversation
          : item,
      )
    : [conversation, ...history];

  updatedHistory.sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedHistory),
  );
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const history = await loadHistory();

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      history.filter(
        (item) => item.id !== conversationId,
      ),
    ),
  );
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/* --------------------------------
   FILE / IMAGE HELPERS
--------------------------------- */

// Reads any local file (phone file, browser blob or data URL) and returns it as base64 text.
async function readUriAsBase64(uri: string): Promise<string> {
  if (uri.startsWith('data:')) {
    return uri.slice(uri.indexOf(',') + 1);
  }

  // Web preview: the file is a blob: or http(s) address the browser can read.
  if (
    typeof document !== 'undefined' &&
    (uri.startsWith('blob:') || uri.startsWith('http'))
  ) {
    const response = await globalThis.fetch(uri);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.readAsDataURL(blob);
    });
  }

  // Phone (Expo Go / built app)
  try {
    const FileSystem = await import('expo-file-system/legacy');

    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    const FileSystem = await import('expo-file-system');

    return await (FileSystem as any).readAsStringAsync(uri, {
      encoding: (FileSystem as any).EncodingType.Base64,
    });
  }
}

async function imageUriToDataUrl(
  image: ChatImage,
): Promise<string> {
  if (image.uri.startsWith('data:image/')) {
    return image.uri;
  }

  try {
    const base64 = await readUriAsBase64(image.uri);
    const mimeType = image.mimeType || 'image/jpeg';

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(
      '[IK TECH AI] Image conversion error:',
      error,
    );

    throw new Error(
      'Could not read the selected image.',
    );
  }
}

async function attachmentToPayload(
  attachment: ChatAttachment,
): Promise<{ name: string; mimeType: string; data: string }> {
  try {
    return {
      name: attachment.name,
      mimeType: attachment.mimeType,
      data: await readUriAsBase64(attachment.uri),
    };
  } catch (error) {
    console.error(
      '[IK TECH AI] Attachment read error:',
      error,
    );

    throw new Error(
      'Could not read the attached file. Please attach it again.',
    );
  }
}

/* --------------------------------
   API URL
--------------------------------- */

function getApiUrl(): string {
  return 'https://autumn-field-496d.ibrahimkhalil79199.workers.dev';
}

/* --------------------------------
   CHAT (streaming)
--------------------------------- */

export async function streamChat(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
): Promise<void> {
  const lastUserMessage = [...messages]
    .reverse()
    .find((item) => item.role === 'user');

  if (!lastUserMessage) {
    throw new Error('No user message to send.');
  }

  const withFileText = (item: ChatMessage): string => {
    const base = item.content.trim();
    return item.attachment?.text
      ? `${base}\n\n[Attached file: ${item.attachment.name}]\n${item.attachment.text}`
      : base;
  };

  const message = withFileText(lastUserMessage);

  if (
    !message &&
    !lastUserMessage.image &&
    !lastUserMessage.attachment
  ) {
    throw new Error('Please enter a message.');
  }

  const conversationMessages = messages
    .slice(-20)
    .filter(
      (item) =>
        item.content.trim().length > 0 ||
        Boolean(item.image) ||
        Boolean(item.attachment?.text),
    )
    .map((item) => ({
      role: item.role,
      content: withFileText(item),
    }));

  const image = lastUserMessage.image
    ? await imageUriToDataUrl(lastUserMessage.image)
    : undefined;

  // The newest message's file is sent as a file. Old chats are not sent again, so they stay light.
  const attachment =
    lastUserMessage.attachment && !lastUserMessage.attachment.text
      ? await attachmentToPayload(lastUserMessage.attachment)
      : undefined;

  // Extra pictures / files the user sent together with the newest message (they are separate small turns).
  const extraItems = messages.filter(
    (item) =>
      item !== lastUserMessage &&
      item.role === 'user' &&
      item.content.startsWith(EXTRA_ITEM_MARK),
  );

  const extraImages: string[] = [];
  const extraAttachments: { name: string; mimeType: string; data: string }[] = [];

  for (const item of extraItems) {
    if (item.image) {
      extraImages.push(await imageUriToDataUrl(item.image));
    }

    if (item.attachment && !item.attachment.text) {
      extraAttachments.push(await attachmentToPayload(item.attachment));
    }
  }

  const totalMediaChars =
    (image?.length || 0) +
    (attachment?.data.length || 0) +
    extraImages.reduce((sum, value) => sum + value.length, 0) +
    extraAttachments.reduce((sum, value) => sum + value.data.length, 0);

  if (totalMediaChars > MAX_MEDIA_CHARS) {
    throw new Error(
      'These files are too big to send together. Please send fewer or smaller files (video and audio under about 8 MB in total).',
    );
  }

  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Please sign in to use IK TECH AI.');
  }

  // The Worker uses this token to know who is asking (for daily limits).
  const idToken = await currentUser.getIdToken();

  // Give up waiting if the AI does not start answering in time.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT_MS);

  let response: Awaited<ReturnType<typeof fetch>>;

  try {
    response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        message:
          message ||
          (attachment
            ? 'Please read the attached file and tell me what is in it, in the language I use.'
            : 'Please examine the attached image and respond in the language I use.'),
        messages: conversationMessages,
        image,
        attachment,
        // More pictures / files sent together with `image` / `attachment` above.
        ...(extraImages.length ? { images: extraImages } : {}),
        ...(extraAttachments.length ? { attachments: extraAttachments } : {}),
      }),
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if ((error as { name?: string })?.name === 'AbortError') {
      throw new Error(
        'The AI took too long to respond (timeout). Please try again.',
      );
    }

    throw error;
  }

  clearTimeout(timeoutId);

  console.log(
    '[IK TECH AI] Cloudflare status:',
    response.status,
  );

  // Error from the Worker (it sends errors as JSON)
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage =
      response.status >= 502 && response.status <= 504
        ? 'The AI is busy right now. Please try again in a moment.'
        : 'The AI service could not respond.';

    try {
      const parsedError = JSON.parse(errorText) as {
        error?: unknown;
      };
      if (typeof parsedError?.error === 'string') {
        errorMessage = parsedError.error;
      }
    } catch {
      errorMessage = `The AI service returned status ${response.status}. ${errorText.slice(0, 200)}`;
    }

    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();

  // Fallback if streaming is not available: read everything at once.
  if (!reader) {
    const fullText = (await response.text()).trim();

    if (!fullText) {
      throw new Error('The AI service returned no answer.');
    }

    onChunk(fullText);
    return;
  }

  const decoder = new TextDecoder();
  let received = false;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    const piece = decoder.decode(value, { stream: true });

    if (piece) {
      received = true;
      onChunk(piece);
    }
  }

  if (!received) {
    throw new Error('The AI service returned no answer.');
  }
}
