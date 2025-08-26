// Simple test examples for MemeGenerator component
// This file demonstrates how the component handles different image URL scenarios

// Example 1: Valid image URL
const validMemeData = {
  prompt: "A cat sitting on a keyboard",
  image_url: "https://example.com/meme-image.jpg",
  image_filename: "meme-123.jpg",
  metadata: {
    timestamp: 1640995200,
    processing_time: 2.5,
    file_size_bytes: 102400,
  },
};

// Example 2: Invalid image URL
const invalidMemeData = {
  prompt: "A dog chasing its tail",
  image_url: "not-a-valid-url",
  image_filename: "meme-456.jpg",
  metadata: {
    timestamp: 1640995200,
    processing_time: 1.8,
  },
};

// Example 3: No image URL
const noImageMemeData = {
  prompt: "A bird flying high",
  image_filename: "meme-789.jpg",
  metadata: {
    timestamp: 1640995200,
    processing_time: 3.2,
  },
};

// Example 4: Base64 image data
const base64MemeData = {
  prompt: "A robot dancing",
  image_base64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  image_filename: "meme-base64.jpg",
  metadata: {
    timestamp: 1640995200,
    processing_time: 2.1,
  },
};

// Example 5: Relative URL that needs to be prefixed
const relativeUrlMemeData = {
  prompt: "A meme about coding",
  image_url: "/images/meme-relative.jpg",
  image_filename: "meme-relative.jpg",
  metadata: {
    timestamp: 1640995200,
    processing_time: 1.5,
  },
};

export {
  validMemeData,
  invalidMemeData,
  noImageMemeData,
  base64MemeData,
  relativeUrlMemeData,
};
