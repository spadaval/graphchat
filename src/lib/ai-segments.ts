import type { TokenInfo, TokenProbability } from "~/lib/state/types";

export const buildTokenInfosFromProbabilities = (
  probabilities: TokenProbability[] | undefined,
): TokenInfo[] => {
  if (!probabilities || probabilities.length === 0) {
    return [];
  }

  let cursor = 0;

  return probabilities.map((prob, index) => {
    const token = prob.token || "";
    const start = cursor;
    const end = cursor + token.length;
    cursor = end;

    return {
      index,
      token,
      logprob: prob.logprob,
      start,
      end,
      topAlternatives: prob.top_logprobs?.map((alt) => ({
        token: alt.token,
        logprob: alt.logprob,
      })),
    };
  });
};

export const textFromTokenInfos = (tokens: TokenInfo[]): string =>
  tokens.map((token) => token.token).join("");

export const buildPrefillContinuationMessages = (
  sourceMessages: { role: "user" | "assistant" | "system"; content: string }[],
  prefix: string,
) => [
  ...sourceMessages,
  {
    role: "system" as const,
    content:
      "Continue from the locked assistant prefix. Output continuation only. Do not repeat the prefix.",
  },
  {
    role: "user" as const,
    content: `<LOCKED_PREFIX>\n${prefix}\n</LOCKED_PREFIX>\nContinue exactly from that prefix.`,
  },
];
