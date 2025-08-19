// Import required modules
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

// Initialize Express application
const app = express();
const port = 3000;

// Middleware to enable CORS and parse JSON bodies
app.use(cors());
app.use(express.json());

// Set your API key securely from an environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_VALID_API_KEY_HERE";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

// Define the chat endpoint
app.post('/chat', async (req, res) => {
    const { prompt, menuData } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    try {
        const payload = {
            contents: [{
                parts: [{
                    text: `You are a helpful and friendly AI assistant for a hostel. You can answer general questions as well as provide information about the hostel's menu. Use the provided menu data to answer menu-related questions.

                    Here is the hostel's weekly menu:
                    ${JSON.stringify(menuData, null, 2)}
                    
                    User query: ${prompt}
                    
                    Provide a detailed and friendly response.`
                }]
            }]
        };

        const apiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Gemini API Error - Status:', apiResponse.status);
            console.error('Gemini API Error - Response Body:', errorText);
            
            // Check for specific error messages from the API
            if (apiResponse.status === 400 && errorText.includes("API key not valid")) {
                return res.status(401).json({ error: 'Invalid API key. Please check your key in server.js.' });
            }
            if (apiResponse.status === 429) {
                return res.status(429).json({ error: 'Too many requests. Please try again later.' });
            }

            return res.status(apiResponse.status).json({ error: 'Failed to get a response from the AI. Check server logs for details.' });
        }

        const result = await apiResponse.json();
        
        if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
            const botResponse = result.candidates[0].content.parts[0].text;
            return res.status(200).json({ text: botResponse });
        } else {
            console.error('Unexpected Gemini API response format:', result);
            return res.status(500).json({ error: 'Unexpected AI response format. Check server logs for details.' });
        }

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log('Backend is ready to handle chat requests.');
});
