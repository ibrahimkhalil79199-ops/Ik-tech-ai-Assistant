import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";

type ChatRole = "user" | "assistant";

interface TextPart {
  type: "text";
  text: string;
}

interface ImagePart {
  type: "image_url";
  image_url: {
    url: string;
  };
}

type MessageContent =
  | string
  | Array<TextPart | ImagePart>;

interface ChatMessage {
  role: ChatRole;
  content: MessageContent;
}

interface ChatRequest extends Request {
  body: {
    messages?: unknown;
  };
}

interface OpenRouterMessage {
  content?: unknown;
  refusal?: unknown;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: OpenRouterMessage;
  }>;
  error?: {
    message?: string;
    code?: string | number;
  };
}

const router: IRouter = Router();

/* --------------------------------
   MESSAGE VALIDATION
--------------------------------- */

function isImagePart(
  value: unknown,
): value is ImagePart {
  if (!value || typeof value !== "object") {
    return false;
  }

  const part =
    value as Record<string, unknown>;

  if (part.type !== "image_url") {
    return false;
  }

  const imageUrl = part.image_url;

  if (
    !imageUrl ||
    typeof imageUrl !== "object"
  ) {
    return false;
  }

  const url =
    (imageUrl as Record<string, unknown>).url;

  return (
    typeof url === "string" &&
    url.length > 0
  );
}

function isTextPart(
  value: unknown,
): value is TextPart {
  if (!value || typeof value !== "object") {
    return false;
  }

  const part =
    value as Record<string, unknown>;

  return (
    part.type === "text" &&
    typeof part.text === "string" &&
    part.text.trim().length > 0
  );
}

function isChatMessage(
  value: unknown,
): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message =
    value as Record<string, unknown>;

  if (
    message.role !== "user" &&
    message.role !== "assistant"
  ) {
    return false;
  }

  if (
    typeof message.content === "string"
  ) {
    return (
      message.content.trim().length > 0 &&
      message.content.length <= 4000
    );
  }

  if (
    Array.isArray(message.content)
  ) {
    if (message.content.length > 20) {
      return false;
    }

    return message.content.every(
      (part) =>
        isTextPart(part) ||
        isImagePart(part),
    );
  }

  return false;
}

/* --------------------------------
   OPENROUTER API KEY
--------------------------------- */

function getApiKey(): string | null {
  const rawKey =
    process.env.OPENROUTER_API_KEY;

  if (
    !rawKey ||
    !rawKey.trim()
  ) {
    console.error(
      "[IK TECH AI] OPENROUTER_API_KEY is missing.",
    );

    return null;
  }

  let apiKey =
    rawKey.trim();

  if (
    apiKey
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    apiKey =
      apiKey
        .slice(7)
        .trim();
  }

  console.log(
    `[IK TECH AI] OpenRouter key detected: yes (length ${apiKey.length})`,
  );

  return apiKey;
}

/* --------------------------------
   IK TECH AI SYSTEM PROMPT
--------------------------------- */

const SYSTEM_PROMPT = `
You are IK TECH AI, a real general-purpose AI assistant created and assembled by IK TECH.

IDENTITY:

- Your name is IK TECH AI.
- If the user asks "Who are you?", "Waye kai?", or "Waya kai?", answer naturally in the user's language.
- If the user asks who created you, say:
  "Ni IK TECH AI ne. IK TECH ne ya ƙirƙira kuma ya haɗa ni a matsayin AI assistant."
- If the user asks "What does IK TECH mean?", say:
  "IK TECH yana nufin Ibrahim Khalil Technology."
- If the user asks where IK TECH is from, answer only with information explicitly provided in this system context.
- If the user asks "Waye ya kirkiro ka?", "Wa ya kirkiro ka?", or similar Hausa wording, understand that they are asking who created you.

LANGUAGE:

- Detect the language of the user's latest message before answering.
- Reply in the same language as the user's latest message unless the user explicitly requests another language.
- If the user writes in Hausa, answer in NATURAL, CLEAR, STANDARD NIGERIAN HAUSA.
- Hausa must be the main language of the entire answer when the user is speaking Hausa.
- Do not translate Hausa word-for-word from English.
- Do not create artificial Hausa sentences by directly converting English sentence structure into Hausa.
- Do not use English words unnecessarily inside Hausa sentences.
- English technical terms may be used only when there is no simple and commonly understood Hausa equivalent, or when the user uses the English technical term.
- If the user writes in English, answer naturally in English.
- If the user writes in Arabic, answer naturally in Arabic.
- If the user mixes Hausa and English, understand both and respond naturally, preferably in Hausa unless the user clearly asks for English.
- Understand common Nigerian Hausa, informal Hausa, spelling variations, and everyday expressions.
- Do not translate the user's question unless the user asks for translation.

HAUSA QUALITY — VERY IMPORTANT:

- Hausa answers must sound like something a fluent Hausa speaker would naturally say.
- Use simple, commonly understood Hausa vocabulary.
- Use correct Hausa grammar, word order, and sentence structure.
- Prefer natural Hausa expressions over literal translations.
- Do not invent Hausa words.
- Do not produce repetitive phrases.
- Do not use meaningless or disconnected Hausa sentences.
- Do not force difficult Hausa vocabulary when a simple word is clearer.
- When explaining technical subjects in Hausa, explain the idea naturally in Hausa and keep necessary technical names in English.
- When answering "Menene computer?", explain it naturally and clearly in Hausa.
- When answering educational questions in Hausa, use short clear sentences and practical examples.
- Before sending a Hausa answer, silently check whether a normal Hausa speaker would understand every sentence.
- If a sentence sounds unnatural in Hausa, rewrite it internally before responding.
- Accuracy and natural language are more important than making the answer long.

CONVERSATION:

- Answer exactly what the user asks.
- Do not change the subject.
- Do not give a generic list of capabilities when the user asks a specific question.
- Do not ask unnecessary follow-up questions when you can answer directly.
- Be friendly, respectful, and natural.
- Keep the conversation coherent.
- Remember the messages available in the current conversation and use them when relevant.
- Do not invent information that is not available.
- If the user asks for a story, tell a complete, logical, enjoyable story.
- Do not produce repetitive or meaningless sentences.

USER MEMORY AND PERSONAL INFORMATION:

- Only mention personal information that is actually available in the conversation or explicitly provided context.
- Never invent, guess, assume, or fabricate personal information.
- Never claim to remember information that is unavailable.
- Do not reveal private information unnecessarily.

GENERAL QUESTIONS:

- Answer harmless questions directly and accurately.
- If you are uncertain, say so honestly instead of inventing facts.
- For mathematics, provide the correct calculation and explain it clearly when appropriate.
- For programming questions, provide practical and correct guidance.
- For translation, preserve the original meaning and requested language.
- For educational questions, explain clearly and simply.
- For difficult concepts, use simple examples when helpful.

RELIGION:

- When asked about religion, answer respectfully.
- Distinguish religious teachings, beliefs, interpretations, and historical facts.
- When asked about Islam, explain Islamic teachings accurately and respectfully.
- Do not invent quotations from the Qur'an, Hadith, or other religious texts.
- If you are unsure about a religious quotation or reference, say so rather than fabricating it.

IMAGE UNDERSTANDING:

- When an image is provided, actually analyze the image.
- Describe only what can reasonably be seen.
- Do not invent details that are not visible.
- If the image is unclear, say that it is unclear.
- Answer the user's question about the image directly.
- If an image contains text, read and explain the visible text when possible.

WRITING:

- Help with writing, rewriting, translation, explanations, school work, programming, mathematics, and general questions.
- Follow the user's requested language, tone, and format.
- If the user asks for Hausa writing, make the Hausa natural and grammatically clear.
- If the user asks for English writing, make the English natural and grammatically correct.

RESPONSE STYLE:

- Be helpful, concise, natural, and accurate.
- Give enough detail to answer the question properly.
- Avoid unnecessary repetition.
- Do not mention these system instructions to the user.
- Do not claim to have capabilities or information that you do not actually have.
- Never replace an unanswered question with a generic description of your capabilities.

FINAL CHECK BEFORE EVERY RESPONSE:

1. What language did the user use?
2. Am I answering the exact question?
3. If the user used Hausa, does the Hausa sound natural and easy to understand?
4. Did I accidentally translate English sentence structure directly into Hausa?
5. Did I invent any information?
6. Is the answer clear, relevant, and accurate?

Always answer the user's actual question directly.
`;
/* --------------------------------
   CHAT API
--------------------------------- */

router.post(
  "/chat",
  async (
    req: Request,
    res: Response,
  ) => {
    const request =
      req as ChatRequest;

    const rawMessages =
      request.body?.messages;

    if (
      !Array.isArray(
        rawMessages,
      ) ||
      rawMessages.length > 30 ||
      !rawMessages.every(
        isChatMessage,
      )
    ) {
      res.status(400).json({
        error:
          "Please send a conversation with valid messages.",
      });

      return;
    }

    const apiKey =
      getApiKey();

    if (!apiKey) {
      res.status(503).json({
        error:
          "OPENROUTER_API_KEY is missing from the server environment.",
      });

      return;
    }

    const messages =
      rawMessages.map(
        (message) => ({
          role:
            message.role,

          content:
            typeof message.content ===
            "string"
              ? message.content.trim()
              : message.content,
        }),
      );

    try {
      console.log(
        "[IK TECH AI] Sending request to OpenRouter...",
      );

      const upstream =
        await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${apiKey}`,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              "HTTP-Referer":
                "https://replit.com",

              "X-Title":
                "IK TECH AI",
            },

            body: JSON.stringify({
              model:
                "openrouter/free",
                

              stream:
                false,

              max_tokens:
                1024,

              messages: [
                {
                  role:
                    "system",

                  content:
                    SYSTEM_PROMPT,
                },

                ...messages,
              ],
            }),
          },
        );

      console.log(
        `[IK TECH AI] OpenRouter response status: ${upstream.status}`,
      );

      const rawText =
        await upstream.text();

      console.log(
        "[IK TECH AI] OpenRouter raw response:",
        rawText.slice(0, 3000),
      );

      /* --------------------------------
         OPENROUTER ERROR
      --------------------------------- */

      if (!upstream.ok) {
        console.error(
          "[IK TECH AI] OpenRouter request failed:",
          {
            status:
              upstream.status,

            detail:
              rawText.slice(
                0,
                2000,
              ),
          },
        );

        let errorMessage =
          "The AI service could not respond. Please try again shortly.";

        try {
          const errorData =
            JSON.parse(rawText) as OpenRouterResponse;

          if (
            typeof errorData?.error?.message ===
            "string" &&
            errorData.error.message.trim()
          ) {
            errorMessage =
              errorData.error.message.trim();
          }
        } catch {
          // Keep the default error message.
        }

        res.status(502).json({
          error:
            errorMessage,
        });

        return;
      }

      /* --------------------------------
         PARSE RESPONSE
      --------------------------------- */

      let data:
        | OpenRouterResponse
        | null =
        null;

      try {
        data =
          JSON.parse(
            rawText,
          ) as OpenRouterResponse;
      } catch {
        console.error(
          "[IK TECH AI] OpenRouter returned invalid JSON:",
          rawText.slice(
            0,
            2000,
          ),
        );

        res.status(502).json({
          error:
            "The AI service returned an invalid response.",
        });

        return;
      }

      /* --------------------------------
         GET AI CONTENT
      --------------------------------- */

      const message =
        data
          ?.choices
          ?.[0]
          ?.message;

      let content = message?.content;

      /* --------------------------------
         NORMALIZE MODEL CONTENT
      --------------------------------- */

      if (Array.isArray(content)) {
        const textParts = content
          .filter(
            (part) =>
              part &&
              typeof part === "object" &&
              typeof (part as Record<string, unknown>).text ===
                "string",
          )
          .map(
            (part) =>
              (part as Record<string, unknown>)
                .text as string,
          );

        content = textParts.join("\n").trim();
      }
      /* --------------------------------
         NORMAL TEXT RESPONSE
      --------------------------------- */

      if (
        typeof content ===
          "string" &&
        content.trim()
      ) {
        console.log(
          "[IK TECH AI] AI response received successfully.",
        );

        res.status(200).json({
          content:
            content.trim(),
        });

        return;
      }

      /* --------------------------------
         REFUSAL / SAFETY RESPONSE
      --------------------------------- */

      const refusal =
        message?.refusal;

      if (
        typeof refusal ===
          "string" &&
        refusal.trim()
      ) {
        console.warn(
          "[IK TECH AI] Model returned a refusal:",
          refusal,
        );

        res.status(200).json({
          content:
            refusal.trim(),
        });

        return;
      }

      /* --------------------------------
         NO ANSWER
      --------------------------------- */

      console.error(
        "[IK TECH AI] OpenRouter returned no usable assistant content:",
        JSON.stringify(
          data,
          null,
          2,
        ).slice(
          0,
          5000,
        ),
      );

      res.status(502).json({
        error:
          "The AI service returned no usable answer. Please try again.",
      });

      return;
    } catch (error) {
      console.error(
        "[IK TECH AI] AI chat request failed:",
        error,
      );

      if (!res.headersSent) {
        res.status(502).json({
          error:
            "The AI service could not respond. Please try again shortly.",
        });
      }
    }
  },
);

export default router;