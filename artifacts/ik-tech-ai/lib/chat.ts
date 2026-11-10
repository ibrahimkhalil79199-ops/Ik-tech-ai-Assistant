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
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  image?: ChatImage;
  attachment?: ChatAttachment;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'ik-tech-ai:history:v1';

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

  // Only the newest message's file is sent, so old chats do not become heavy.
  const attachment =
    lastUserMessage.attachment && !lastUserMessage.attachment.text
      ? await attachmentToPayload(lastUserMessage.attachment)
      : undefined;

  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Please sign in to use IK TECH AI.');
  }

  // The Worker uses this token to know who is asking (for daily limits).
  const idToken = await currentUser.getIdToken();

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      message:
        message ||
        (attachment
          ? 'Please read the attached file and tell me what is in it, in the language I use.'
          : 'Please examine the attached image and respond in the language I use.'),
      messages: conversationMessages,
      image,
      attachment,
    }),
  });

  console.log(
    '[IK TECH AI] Cloudflare status:',
    response.status,
  );

  // Error from the Worker (it sends errors as JSON)
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'The AI service could not respond.';

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
