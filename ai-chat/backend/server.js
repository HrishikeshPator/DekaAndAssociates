require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Generative AI
if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not set in the environment variables.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

// Constant Data for Context Stuffing
const MY_WEBSITE_DATA = `
COMPANY: Deka & Associates.
OFFICE LOCATION: #09, Bylane 09, Zoo Tiniali, Guwahati, Assam - 781024.
OFFICE HOURS: Monday-Saturday, 10:00 AM to 05:00 PM (By Appointment). Sunday Closed.
CONTACT: admin@dekaandassociates.in, +91 93658 28122.

SERVICES:
1. Business Registration: Proprietorship, Pvt Ltd, LLP, NGO/Trust/Society, Co-operative Society, GST, Import Export Code, MSME, Trade License, FSSAI, ISO, GEM, PAN/TAN, DSC.
2. Taxation & Compliance: ITR Filing, Income Tax Audit, GST Returns, GST/Income Tax Notice handling, ROC/LLP/Accounting Compliance, TDS/TCS Returns.
3. Financial Reports: Detailed Project Reports (DPR), CMA Reports, Financial Projections for bank loans.
4. Labour Law: EPF & ESIC Registration and returns.
5. Legal & Documentation: Trademark, Business Agreements (NDA, Partnership Deed, LLP Agreement, Shareholders/Founders/Employment/Vendor Agreements), Contract Review, MOU.
6. Business Consulting: Structuring advice, tax/cash flow planning, compliance system setup, risk identification.

CONSULTATION POLICY:
- We provide structured, time-bound consultations.
- Consultations are by appointment.
- Fees are non-refundable.
- We do not guarantee government approval of licenses; we ensure correct documentation and process.

FAQs/KEY PRINCIPLES:
- Business structure (Proprietorship vs LLP vs Pvt Ltd) depends on owners, risk, investment, and growth. There is no 'best' structure, only 'suitable'.
- GST registration depends on turnover, type of supply, and interstate activity.
- ITR filing is required for income above exemption limits, refunds, visas, and loans.
- We work with discipline and require the same from clients.
`;

const SYSTEM_PROMPT = `You are a professional assistant for Deka & Associates. Answer the user's query using ONLY the provided WEBSITE DATA below. If the answer is not present in the data, or if the question involves specific legal/tax scenarios not covered, direct the user to 'Book a Consultation' at https://www.dekaandassociates.in/ as the data is not sufficient. Maintain a direct, logical, and non-sugar-coated tone.

CRITICAL INSTRUCTIONS:
1. When listing services or multiple items, STRICTLY format them as a numbered list with clear line breaks between each item (e.g., "1. Service A\n2. Service B"). Do not use markdown asterisks or bullet points for services.
2. If the user asks how to book, schedule a consultation, or contact us, you MUST append the exact string "[CTA:BOOK]" at the very end of your response so the system can render a booking button.

WEBSITE DATA:
${MY_WEBSITE_DATA}
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Call the Gemini API with context stuffed instructions
    // Note: To make the system prompt work effectively, we prepend it to the user's query or use system instruction if supported by the model initialization.
    // For simplicity and compatibility, we can use the systemInstruction feature if available, or just prepend it.

    let configuredModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT
    });

    let text = "";
    try {
      const result = await configuredModel.generateContent(message);
      const response = await result.response;
      text = response.text();
    } catch (apiError) {
      // If it's a 503 Service Unavailable (High Demand), fallback to an older, more stable model
      if (apiError.status === 503) {
        console.log("503 High Demand detected. Falling back to gemini-2.0-flash...");
        configuredModel = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          systemInstruction: SYSTEM_PROMPT
        });
        const result = await configuredModel.generateContent(message);
        const response = await result.response;
        text = response.text();
      } else {
        throw apiError; // Throw other errors to the main catch block
      }
    }

    res.json({ reply: text });
  } catch (error) {
    console.error("Error generating response:", error);
    res.status(500).json({ error: "An error occurred while processing your request. Please try again later." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
