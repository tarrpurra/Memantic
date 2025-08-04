from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Union, Dict, Any, Optional
from meme_generator import image_generation
from caption_generator import generate_caption
from art_generate import generate_caption_from_bytes
from art_generate import transform_image_to_style_api
import logging
import tempfile
import os
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create directories for generated images
os.makedirs("generated_images", exist_ok=True)
os.makedirs("static", exist_ok=True)

app = FastAPI(
    title="Meme Generator & Image Transformation API",
    description="A FastAPI application for generating memes and transforming images with AI",
    version="2.0.0"
)

# Serve static files (for generated images)
app.mount("/static", StaticFiles(directory="generated_images"), name="static")

@app.get("/generate_meme")
def generate_meme(prompt: str = None) -> Dict[str, Any]:
    """
    Generate a meme based on the provided prompt.
   
    Args:
        prompt (str): The prompt for the meme generation.
       
    Returns:
        dict: A dictionary containing the meme concept, captions, and image path.
        
    Raises:
        HTTPException: If the generation fails.
    """
    try:
        # Handle missing prompt parameter
        if prompt is None or prompt.strip() == "":
            raise HTTPException(status_code=400, detail="Prompt parameter is required and cannot be empty")
        
        # Use the actual prompt parameter instead of hardcoded text
        caption_prompt = f"Create a meme with a top, middle and bottom caption based on: {prompt}"
        caption = generate_caption(caption_prompt)
        
        # Log the generated caption details
        logger.info("Generated Caption:")
        logger.info(f"Meme Concept: {caption.get('meme_concept', 'N/A')}")
        logger.info(f"Top Caption: {caption.get('top_caption', 'N/A')}")
        
        if 'middle_caption' in caption:
            logger.info(f"Middle Caption: {caption['middle_caption']}")
        else:
            logger.info("Middle Caption: (not provided)")
            
        logger.info(f"Bottom Caption: {caption.get('bottom_caption', 'N/A')}")
        
        # Generate the image
        image_path = image_generation(caption)
        
        # Return structured response
        return {
            "success": True,
            "caption": caption,
            "image_path": image_path,
            "prompt_used": prompt
        }
        
    except Exception as e:
        logger.error(f"Error generating meme: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate meme: {str(e)}")

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "meme-generator"}

@app.get("/")
def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to the Meme Generator & Image Transformation API",
        "endpoints": {
            "/generate_meme": "Generate a meme based on a prompt (GET)",
            "/generate_meme_v2": "Generate a meme with request body (POST)",
            "/transform_image": "Transform image with AI description only (POST)",
            "/transform_image_with_generation": "Transform image AND generate new image (POST)",
            "/download_image/{filename}": "Download a generated image file (GET)",
            "/list_generated_images": "List all generated images (GET)",
            "/health": "Health check",
            "/docs": "API documentation"
        },
        "image_transformation_examples": [
            "make it steampunk",
            "convert to anime style", 
            "make it cyberpunk",
            "turn into a fantasy artwork",
            "make it look futuristic",
            "convert to oil painting style"
        ]
    }

# Optional: Add request/response models for better API documentation
from pydantic import BaseModel

class MemeRequest(BaseModel):
    prompt: str
    style: str = "classic"  # Optional style parameter
    
class MemeResponse(BaseModel):
    success: bool
    caption: Dict[str, str]
    image_path: str
    prompt_used: str

@app.post("/generate_meme_v2")
def generate_meme_v2(request: MemeRequest) -> MemeResponse:
    """
    Alternative endpoint using POST with request body.
    
    Args:
        request (MemeRequest): The meme generation request.
        
    Returns:
        MemeResponse: The meme generation response.
    """
    try:
        caption_prompt = f"Create a meme with a top, middle and bottom caption based on: {request.prompt}"
        if request.style != "classic":
            caption_prompt += f" in {request.style} style"
            
        caption = generate_caption(caption_prompt)
        image_path = image_generation(caption)
        
        return MemeResponse(
            success=True,
            caption=caption,
            image_path=image_path,
            prompt_used=request.prompt
        )
        
    except Exception as e:
        logger.error(f"Error generating meme: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate meme: {str(e)}")

@app.post("/transform_image")
async def transform_image(
    file: UploadFile = File(...),
    prompt: str = Form(...)
) -> Dict[str, Any]:
    """
    Transform an uploaded image based on artistic prompt using AI.
    
    Args:
        file: The image file to transform
        prompt: The artistic transformation prompt (e.g., "make it steampunk", "anime style")
        
    Returns:
        dict: A dictionary containing the artistic transformation description.
        
    Raises:
        HTTPException: If the transformation fails.
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Check file size (limit to 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        contents = await file.read()
        if len(contents) > max_size:
            raise HTTPException(status_code=400, detail="File size too large. Maximum 10MB allowed.")
        
        # Validate prompt
        if not prompt or prompt.strip() == "":
            raise HTTPException(status_code=400, detail="Artistic transformation prompt is required")
        
        logger.info(f"Processing image transformation: {file.filename} with prompt: {prompt}")
        
        # Process the image with AI
        result = generate_caption_from_bytes(contents, file.filename, prompt.strip())
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        logger.info("Image transformation completed successfully")
        
        return {
            "success": True,
            "filename": file.filename,
            "content_type": file.content_type,
            "transformation_prompt": prompt,
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transforming image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to transform image: {str(e)}")

@app.post("/transform_image_file")
async def transform_image_file(
    file: UploadFile = File(...),
    prompt: str = Form(...)
) -> Dict[str, Any]:
    """
    Alternative endpoint that saves the file temporarily before processing.
    
    Args:
        file: The image file to transform
        prompt: The artistic transformation prompt
        
    Returns:
        dict: A dictionary containing the artistic transformation description.
    """
    temp_file_path = None
    try:
        # Validate inputs
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        if not prompt or prompt.strip() == "":
            raise HTTPException(status_code=400, detail="Artistic transformation prompt is required")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            contents = await file.read()
            temp_file.write(contents)
            temp_file_path = temp_file.name
        
        logger.info(f"Processing image file: {file.filename} with prompt: {prompt}")
        
        # Import the function that works with file paths
        from art_generate import generate_caption_robust
        result = generate_caption_robust(temp_file_path, prompt.strip())
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "filename": file.filename,
            "transformation_prompt": prompt,
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transforming image file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to transform image: {str(e)}")
@app.post("/transform_image_with_generation")
async def transform_image_with_generation(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    generate_image: bool = Form(True),  # Kept for compatibility, not needed
    image_generator: str = Form("controlnet")  # Ignored but accepted
) -> Dict[str, Any]:
    """
    Transform an uploaded image using an external AI API (e.g., ControlNet via Hugging Face).
    
    Args:
        file: The image file to transform
        prompt: The artistic transformation prompt
        
    Returns:
        dict: Response with optionally generated image URL
    """
    try:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        contents = await file.read()
        max_size = 10 * 1024 * 1024  # 10MB
        if len(contents) > max_size:
            raise HTTPException(status_code=400, detail="File too large. Max 10MB allowed.")

        if not prompt or prompt.strip() == "":
            raise HTTPException(status_code=400, detail="Prompt is required.")

        logger.info(f"Calling ControlNet API to transform image with prompt: {prompt}")

        result = transform_image_to_style_api(contents, prompt.strip())

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        filename = os.path.basename(result["generated_image_path"])
        return {
            "success": True,
            "filename": file.filename,
            "prompt": prompt,
            "download_url": f"/download_image/{filename}",
            "static_url": f"/static/{filename}",
            "result": result
        }

    except Exception as e:
        logger.error(f"Error during image transformation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download_image/{filename}")
async def download_image(filename: str):
    """
    Download a generated image file.
    
    Args:
        filename: The name of the generated image file
        
    Returns:
        FileResponse: The image file for download
    """
    file_path = os.path.join("generated_images", filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='image/png'
    )

@app.get("/list_generated_images")
def list_generated_images():
    """
    List all generated images with their download URLs.
    
    Returns:
        dict: List of generated images and their URLs
    """
    try:
        generated_dir = "generated_images"
        if not os.path.exists(generated_dir):
            return {"images": []}
        
        image_files = [f for f in os.listdir(generated_dir) 
                      if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
        
        images = []
        for filename in sorted(image_files, reverse=True):  # Most recent first
            file_path = os.path.join(generated_dir, filename)
            file_stats = os.stat(file_path)
            
            images.append({
                "filename": filename,
                "download_url": f"/download_image/{filename}",
                "static_url": f"/static/{filename}",
                "created_time": file_stats.st_ctime,
                "size_bytes": file_stats.st_size
            })
        
        return {
            "total_images": len(images),
            "images": images[:20]  # Return only latest 20
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list images: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)