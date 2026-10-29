import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { z } from 'zod'
import type { AIExtractionResult, ExtractedPersonCandidate, ExtractedRelationshipCandidate } from '@/types'

// ============================================================
// Gemini AI Client - SERVER SIDE ONLY
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!GEMINI_API_KEY) {
  console.warn(
    '⚠️  GEMINI_API_KEY is not set. AI document analysis will be unavailable.\n' +
    'Get your API key from: https://aistudio.google.com/app/apikey\n' +
    'Add it to .env.local as: GEMINI_API_KEY=your-key-here'
  )
}

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-pro'

function getGeminiClient() {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file.'
    )
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY)
}

// ============================================================
// Zod Validation Schema for AI Output
// ============================================================

const SourceRegionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  page: z.number().optional(),
}).nullable()

const ExtractedPersonSchema = z.object({
  temporary_id: z.string(),
  name_original_script: z.string().min(1, 'Name cannot be empty'),
  normalized_name: z.string().nullable(),
  alternate_spellings: z.array(z.string()).default([]),
  gender: z.enum(['male', 'female', 'other', 'unknown']).default('unknown'),
  birth_date: z.string().nullable(),
  death_date: z.string().nullable(),
  notes: z.array(z.string()).default([]),
  text_confidence: z.number().min(0).max(1),
  source_region: SourceRegionSchema,
})

const ExtractedRelationshipSchema = z.object({
  person_a: z.string(),
  person_b: z.string(),
  relationship_type: z.enum(['parent_child', 'spouse', 'sibling', 'other']),
  direction: z.enum(['a_to_b', 'b_to_a', 'bidirectional']),
  relationship_confidence: z.number().min(0).max(1),
  evidence: z.string(),
  source_region: SourceRegionSchema,
})

const AIExtractionResultSchema = z.object({
  document_id: z.string(),
  page_id: z.string(),
  people: z.array(ExtractedPersonSchema),
  relationships: z.array(ExtractedRelationshipSchema),
  unresolved_items: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  raw_text: z.string().optional(),
  processing_notes: z.string().optional(),
})

// ============================================================
// System Prompt for Bengali Genealogy Analysis
// ============================================================

const SYSTEM_PROMPT = `You are an expert genealogist and Bengali handwriting analyst. Your task is to analyze handwritten Bengali genealogy documents and extract structured family tree information.

CRITICAL RULES:
1. Extract names EXACTLY as written in the document. Do NOT correct, normalize, or change Bengali spellings.
2. Store the original Bengali script in name_original_script field.
3. If you cannot read a name with confidence, mark text_confidence below 0.5 and include it in warnings.
4. NEVER invent or guess names that are not clearly visible.
5. NEVER assume relationships without visual evidence (arrows, lines, labels).
6. Mark unknown gender as "unknown". Do NOT assume gender from names.
7. Arrows (→) typically indicate parent-to-child or hierarchical relationships.
8. Horizontal lines connecting names often indicate siblings or spouses.
9. The word "END" or "শেষ" may indicate a line termination.
10. If a bounding box cannot be determined, set source_region to null.
11. All confidence scores must reflect your actual certainty (0.0 = no confidence, 1.0 = certain).
12. Include ALL detected people, even partially readable ones.

RELATIONSHIP INTERPRETATION:
- Vertical arrow (↓) from A to B: A is parent of B (direction: "a_to_b", type: "parent_child")
- Horizontal line connecting A and B: Could be spouse or sibling - use context
- If labeled "স্বামী/স্ত্রী" or "বিবাহ": spouse relationship
- If people are at the same level under a common parent: siblings
- Document structure context is crucial for determining relationship direction

OUTPUT FORMAT: Return ONLY valid JSON matching the exact schema provided. No markdown, no explanations outside the JSON.`

// ============================================================
// Main Analysis Function
// ============================================================

export async function analyzeGenealgyDocument(
  imageData: string | Buffer,
  mimeType: string,
  documentId: string,
  pageId: string,
): Promise<AIExtractionResult> {
  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1, // Low temperature for factual extraction
      maxOutputTokens: 8192,
    },
  })

  const userPrompt = `Analyze this handwritten Bengali genealogy document page.

Extract all people and relationships visible in the document.

The document_id is: ${documentId}
The page_id is: ${pageId}

Return a JSON object with exactly this structure:
{
  "document_id": "${documentId}",
  "page_id": "${pageId}",
  "people": [
    {
      "temporary_id": "TMP-001",
      "name_original_script": "exact Bengali text as written",
      "normalized_name": null,
      "alternate_spellings": [],
      "gender": "unknown",
      "birth_date": null,
      "death_date": null,
      "notes": [],
      "text_confidence": 0.85,
      "source_region": null
    }
  ],
  "relationships": [
    {
      "person_a": "TMP-001",
      "person_b": "TMP-002",
      "relationship_type": "parent_child",
      "direction": "a_to_b",
      "relationship_confidence": 0.75,
      "evidence": "Downward arrow from TMP-001 to TMP-002",
      "source_region": null
    }
  ],
  "unresolved_items": ["Description of anything unclear or ambiguous"],
  "warnings": ["Any warnings about low confidence or ambiguous content"],
  "raw_text": "All text you can read from the document, Bengali first",
  "processing_notes": "Any notes about the document structure or challenges"
}`

  // Prepare image part
  let imagePart: Part
  if (typeof imageData === 'string') {
    // Base64 string
    imagePart = {
      inlineData: {
        data: imageData,
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      },
    }
  } else {
    // Buffer - convert to base64
    imagePart = {
      inlineData: {
        data: imageData.toString('base64'),
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      },
    }
  }

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            { text: userPrompt },
            imagePart,
          ],
        },
      ],
    })

    const responseText = result.response.text()

    // Parse the JSON response
    let parsedData: unknown
    try {
      parsedData = JSON.parse(responseText)
    } catch {
      // Sometimes the model adds markdown code blocks - strip them
      const cleaned = responseText
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
      parsedData = JSON.parse(cleaned)
    }

    // Validate with Zod schema
    const validated = AIExtractionResultSchema.parse(parsedData)

    return validated as AIExtractionResult

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown AI error'

    // Return a structured error result
    return {
      document_id: documentId,
      page_id: pageId,
      people: [],
      relationships: [],
      unresolved_items: [],
      warnings: [`AI analysis failed: ${errorMessage}`],
      processing_notes: `Error during analysis: ${errorMessage}`,
    }
  }
}

// ============================================================
// PDF Analysis (via Gemini's PDF understanding)
// ============================================================

export async function analyzePDFPage(
  pdfBuffer: Buffer,
  pageIndex: number,
  documentId: string,
  pageId: string,
): Promise<AIExtractionResult> {
  // For PDFs, we'll use the PDF MIME type with Gemini
  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  })

  const pdfPart: Part = {
    inlineData: {
      data: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    },
  }

  const userPrompt = `Analyze page ${pageIndex + 1} of this Bengali genealogy PDF document.
  
document_id: ${documentId}
page_id: ${pageId}
page_number: ${pageIndex + 1}

Extract all people and relationships from this page.

Return valid JSON matching the genealogy extraction schema.`

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            { text: userPrompt },
            pdfPart,
          ],
        },
      ],
    })

    const responseText = result.response.text()
    let parsedData: unknown

    try {
      parsedData = JSON.parse(responseText)
    } catch {
      const cleaned = responseText
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
      parsedData = JSON.parse(cleaned)
    }

    return AIExtractionResultSchema.parse(parsedData) as AIExtractionResult
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      document_id: documentId,
      page_id: pageId,
      people: [],
      relationships: [],
      unresolved_items: [],
      warnings: [`PDF analysis failed: ${errorMessage}`],
    }
  }
}

// ============================================================
// Confidence Thresholds
// ============================================================

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,       // Auto-suggest for review (still needs approval)
  MEDIUM: 0.65,     // Show with caution indicator
  LOW: 0.40,        // Flag as uncertain reading
  VERY_LOW: 0.20,   // Show as "barely readable"
} as const

export function getConfidenceLabel(score: number): string {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'উচ্চ আস্থা'    // High confidence
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'মাঝারি আস্থা'  // Medium confidence
  if (score >= CONFIDENCE_THRESHOLDS.LOW) return 'কম আস্থা'       // Low confidence
  return 'অনিশ্চিত'                                                // Uncertain
}

export function getConfidenceColor(score: number): string {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'text-green-600'
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'text-yellow-600'
  if (score >= CONFIDENCE_THRESHOLDS.LOW) return 'text-orange-600'
  return 'text-red-600'
}
