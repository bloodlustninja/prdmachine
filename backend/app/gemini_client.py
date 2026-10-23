import os
import time
from typing import Generator
from google import genai
from google.genai.errors import ClientError, ServerError
from dotenv import load_dotenv

load_dotenv()

FALLBACK_MODELS = [
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-pro-latest",
]

def get_gemini_client() -> genai.Client:
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def stream_content_with_fallback(client: genai.Client, prompt: str) -> Generator[str, None, None]:
    """Streams content using stable verified models with graceful fallback."""
    for model_name in FALLBACK_MODELS:
        try:
            print(f"[LLM] Attempting stream with model: {model_name}")
            response = client.models.generate_content_stream(
                model=model_name,
                contents=prompt,
            )
            for chunk in response:
                yield chunk.text or ""
            return
        except (ClientError, ServerError, Exception) as err:
            err_msg = str(err)
            print(f"[LLM] Model {model_name} failed: {err_msg}")
            if any(code in err_msg for code in ["503", "429", "404", "UNAVAILABLE"]):
                time.sleep(1)
                continue
            raise err

    raise RuntimeError("All models currently busy. Please retry shortly.")
