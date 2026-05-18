import { env } from '../config/env.js';

export interface OcrRequest {
  imageBase64: string;
  language?: string;
}

export interface OcrResponse {
  text: string;
  confidence: number;
}

export interface ScoringRequest {
  document: string;
  rubric: string;
}

export interface ScoringResponse {
  score: number;
  rationale: string;
}

async function call<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${env.AI_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`AI service ${path} returned ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as TRes;
}

export const aiService = {
  ocr: (req: OcrRequest) => call<OcrRequest, OcrResponse>('/ai/ocr', req),
  score: (req: ScoringRequest) => call<ScoringRequest, ScoringResponse>('/ai/score', req),
};
