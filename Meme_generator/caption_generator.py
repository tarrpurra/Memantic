from google import genai
from google.genai import types
import json
import re
from dotenv import load_dotenv
import os
load_dotenv()

gemini_api_key = os.getenv('GEMINI_API')

client = genai.Client(
    api_key=gemini_api_key,
    
)



def generate_caption(prompt: str):
    response = client.models.generate_content(
        model='gemini-2.0-flash-001',
        contents=f'{prompt}',
        config=types.GenerateContentConfig(
            system_instruction='''Create a viral meme idea with a top and bottom caption.
            The meme should contain only the top and bottom captions, and optionally a middle caption if relevant.
            The meme should can be about the condition the user have given also do not generate if the user using bad prompt and return Sorry I did not like your prompt. Use a relatable tone and humor that will appeal to tech-savvy Gen Z users.
            Output format:
            - Meme concept (brief description of image)
            - Top caption
            - Middle caption (optional, can be None)
            - Bottom caption
            - bad prompt (optional, can be None) 

            IMPORTANT: Return ONLY valid JSON format with keys: "meme_concept", "top_caption", "bottom_caption","middle_caption is optional so if not generated write None" .
            Do not include any additional text, explanations, or markdown formatting.
            IMPOTANT: In Meme Concept, provide a description of the image that would fit the captions. As i will use it to generate the image.
            Example:
            {
                "meme_concept": "In left side a person is sitting on a computer and in right side a robot is sitting on a computer or a person is sitting on a computer and in right side a robot is sitting on a computer",
                "top_caption": "When AI takes over your morning routine",
                "middle_caption": "But still can't brew a decent cup of coffee",(optional)
                "bottom_caption": "At least it doesn't spill it everywhere"
            }
            The meme concept should be a brief description of the image that would fit the captions.
            The example is just for reference, do not include it in your response.
            ''',
            max_output_tokens=150,  # Increased slightly for JSON formatting
            temperature=0.7,
            top_p=0.9,
            candidate_count=1,
            stop_sequences=['\n\n'],
        ),
    )
    
    # Method 1: Direct JSON parsing (cleanest if API returns clean JSON)
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        pass
    
    # Method 2: Clean the response text and try again
    try:
        # Remove markdown code blocks if present
        cleaned_text = re.sub(r'```json\s*|\s*```', '', response.text.strip())
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        pass
    
    # Method 3: Fallback - return raw text with warning
    print(f"Warning: Could not parse JSON. Raw response: {response.text}")
    return {"error": "Failed to parse JSON", "raw_response": response.text}

# Alternative version with more robust JSON extraction
def generate_caption_robust():
    response = client.models.generate_content(
        model='gemini-2.0-flash-001',
        contents='Generate a meme about AI taking over everything, from making coffee to writing code.',
        config=types.GenerateContentConfig(
            system_instruction='''Create a viral meme idea with a top and bottom caption.
            The meme should be about AI taking over everything — from making coffee to writing code. Use a relatable tone and humor that will appeal to tech-savvy Gen Z users.
            
            Return your response as valid JSON with these exact keys: "meme_concept", "top_caption", "bottom_caption".
            Do not include any text outside the JSON object.
            ''',
            max_output_tokens=150,
            temperature=0.7,
            top_p=0.9,
            candidate_count=1,
        ),
    )
    
    def extract_json_from_text(text):
        """Extract JSON object from potentially messy text"""
        # Try to find JSON object in the text
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        
        # If no valid JSON found, create a fallback structure
        return {
            "meme_concept": "AI robot at computer",
            "top_caption": "AI when it takes over everything",
            "bottom_caption": "But still asks 'Are you sure?' 47 times",
            "note": "Fallback response - original parsing failed"
        }
    
    try:
        # First try direct parsing
        return json.loads(response.text.strip())
    except json.JSONDecodeError:
        # Fallback to extraction method
        return extract_json_from_text(response.text)

    
