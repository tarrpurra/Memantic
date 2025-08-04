from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
import base64
import replicate
import requests
from caption_generator import generate_caption
from dotenv import load_dotenv
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
def clean(text):
    if not text:
        return ""
    return str(text).strip().replace('"', "'").replace("\n", " ")

def image_generation(prompt: str = None):
    """
    Generate a meme image using Replicate Imagen-4 as primary method,
    with Gemini as backup if Replicate fails.
    Returns the path to the generated image file.
    """
    # Generate a meme caption
    caption = prompt

    # Print the generated caption
    print("Generated Caption:")
    print(f"Meme Concept: {caption}")
    
    # Create the prompt
    prompt = (
    f"Create an image for the following meme concept: {caption['meme_concept']} "
    f"with top caption '{caption['top_caption']}' " +
    (f"with middle caption '{caption['middle_caption']}' " if caption.get('middle_caption') else "") +
    f"and bottom caption '{caption['bottom_caption']}'. "
    "IMPORTANT: Always create a unique image for each prompt. Do not use the same image for different prompts."
    )

    
    # Try Replicate first
    image_path = generate_with_replicate(prompt)
    
    if image_path:
        print("✅ Image generated successfully with Replicate Imagen-4")
        return image_path
    else:
        print("⚠️ Replicate failed, trying Gemini as backup...")
        image_path = generate_with_gemini(prompt)
        if image_path:
            print("✅ Image generated successfully with Gemini backup")
            return image_path
        else:
            print("❌ Both image generation methods failed")
            return None

def generate_with_replicate(prompt):
    """
    Generate image using Replicate Imagen-4
    Returns image path if successful, None if failed
    """
    try:
        replicate_token = os.getenv("REPLICATE_API_TOKEN")
        if not replicate_token:
            logger.error("REPLICATE_API_TOKEN not found in environment variables")
            return None
        
        client = replicate.Client(api_token=replicate_token)
        
        input_data = {
            "prompt": prompt,
            "aspect_ratio": "16:9",
            "safety_filter_level": "block_medium_and_above"
        }
        
        print("🔄 Generating image with Replicate Imagen-4...")
        output = client.run("google/imagen-4", input=input_data)
        
        if output:
            try:
                # Handle different types of output from Replicate
                image_url = None
                
                # Method 1: Direct FileOutput object
                if hasattr(output, 'url'):
                    image_url = output.url
                    print(f"📥 Found image URL from FileOutput: {image_url}")
                
                # Method 2: Check if it's iterable (list/generator)
                elif hasattr(output, '__iter__') and not isinstance(output, str):
                    try:
                        output_list = list(output)
                        if output_list:
                            first_item = output_list[0]
                            if hasattr(first_item, 'url'):
                                image_url = first_item.url
                            else:
                                image_url = str(first_item)
                            print(f"📥 Found image URL from list: {image_url}")
                    except Exception as e:
                        logger.warning(f"Could not convert output to list: {e}")
                
                # Method 3: Direct string URL
                else:
                    image_url = str(output)
                    print(f"📥 Using direct URL: {image_url}")
                
                if not image_url:
                    logger.error("Could not extract image URL from output")
                    return None
                
                # Download the image
                print(f"⬇️ Downloading image from: {image_url}")
                response = requests.get(image_url, timeout=30)
                response.raise_for_status()
                
                # Save the image
                image_path = 'replicate-generated-image.png'
                with open(image_path, 'wb') as f:
                    f.write(response.content)
                
                # Display the image
                image = Image.open(image_path)
                image.show()
                
                return image_path
                
            except Exception as e:
                logger.error(f"Error processing Replicate output: {e}")
                logger.info(f"Output type: {type(output)}")
                logger.info(f"Output attributes: {dir(output) if hasattr(output, '__dict__') else 'No attributes'}")
                return None
        else:
            logger.error("No output received from Replicate")
            return None
            
    except Exception as e:
        logger.error(f"Replicate image generation failed: {str(e)}")
        return None

def generate_with_gemini(prompt):
    """
    Generate image using Gemini as backup
    Returns image path if successful, None if failed
    """
    try:
        gemini_api_key = os.getenv('GEMINI_API')
        if not gemini_api_key:
            logger.error("GEMINI_API key not found in environment variables")
            return None
        
        client = genai.Client(api_key=gemini_api_key)
        
        print("🔄 Generating image with Gemini backup...")
        response = client.models.generate_content(
            model="gemini-2.0-flash-preview-image-generation",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE']
            )
        )
        
        for part in response.candidates[0].content.parts:
            if part.text is not None:
                print("Gemini response:", part.text)
            elif part.inline_data is not None:
                # Save the image
                image_path = 'gemini-generated-image.png'
                image = Image.open(BytesIO(part.inline_data.data))
                image.save(image_path)
                image.show()
                return image_path
        
        logger.error("No image data received from Gemini")
        return None
        
    except Exception as e:
        logger.error(f"Gemini image generation failed: {str(e)}")
        return None
