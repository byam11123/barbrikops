import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// Helper: AI Client initialization
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// AI Quotation Extraction API Endpoint
app.post('/api/quotation/extract', async (req, res) => {
  try {
    const { rawText, imageBase64, mimeType, existingItems = [] } = req.body;

    const ai = getAiClient();
    if (!ai) {
      return res.status(200).json({
        success: false,
        error: 'GEMINI_API_KEY not configured on server',
        useFallback: true,
      });
    }

    const itemsContextStr = JSON.stringify(
      existingItems.map((it: any) => ({
        id: it.id,
        itemName: it.itemName,
        brandMake: it.brandMake || '',
        unit: it.unit || '',
        qty: it.qty || 1,
      }))
    );

    const promptText = `You are an expert procurement and financial audit AI for heavy construction & infrastructure projects (Barbrik Project Ltd.).
Analyze the provided quotation document image or WhatsApp chat message text and extract all vendor quotation details accurately.

Requisition Line Items to Match against:
${itemsContextStr}

Instructions:
1. Extract Vendor Name, Contact Phone/Person, Address/Location, Quotation Date, Payment Terms, Freight Terms, GST/Tax Terms (e.g. "Inclusive 18% GST", "Exclusive 18% GST").
2. For each line item in the quotation:
   - Extract raw item description as written by vendor.
   - Extract brand/make specified by vendor.
   - Extract unit and quantity.
   - Extract unit base rate (₹), GST %, landed unit rate (₹), total line amount (₹).
3. SMART ITEM MATCHING:
   - Compare vendor's item name/description with the provided Requisition Line Items.
   - Select the best matching Requisition Item ID from the list.
   - Provide a similarity confidence score between 0.0 and 1.0 (e.g., 0.95 for exact/close match, 0.40 for low confidence).
   - If no reasonable match exists, set matchedItemId to null and confidenceScore to 0..

Return strict JSON adhering to this schema:
{
  "vendorName": "string",
  "contactDetails": "string",
  "storeAddress": "string",
  "quotationDate": "string",
  "paymentTerms": "string",
  "freightTerms": "string",
  "gstTerms": "string",
  "extractedItems": [
    {
      "itemRawName": "string",
      "brandMake": "string",
      "unit": "string",
      "qty": 1,
      "baseRate": 0,
      "gstPercent": 18,
      "gstAmount": 0,
      "landedRate": 0,
      "totalAmount": 0,
      "matchedItemId": "string or null",
      "confidenceScore": 0.95,
      "matchReason": "string"
    }
  ]
}`;

    const contents: any[] = [];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '').replace(/^data:application\/pdf;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: cleanBase64,
        },
      });
    }

    if (rawText) {
      contents.push({ text: `WhatsApp Chat / Text Quotation:\n${rawText}` });
    }

    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: contents },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch (parseErr) {
      console.error('Failed to parse Gemini response as JSON:', parseText(responseText));
      parsedData = { rawExtraction: responseText };
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error in /api/quotation/extract:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract quotation',
      useFallback: true,
    });
  }
});

function parseText(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

// Setup Vite or Static Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FMS Tracker Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
