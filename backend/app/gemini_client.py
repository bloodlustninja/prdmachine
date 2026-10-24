import os
import time
from typing import Generator, Optional, List
from google import genai
from google.genai.errors import ClientError, ServerError
from dotenv import load_dotenv

load_dotenv()

DEFAULT_FALLBACK_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-pro-latest",
]

def get_gemini_client(api_key: Optional[str] = None) -> genai.Client:
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        raise ValueError("Missing Gemini API Key. Provide it in the request or set GEMINI_API_KEY.")
    return genai.Client(api_key=key)

def stream_content_with_fallback(
    client: genai.Client, prompt: str, preferred_model: Optional[str] = None
) -> Generator[str, None, None]:
    model_queue: List[str] = []
    if preferred_model and preferred_model.strip():
        model_queue.append(preferred_model.strip())
    for m in DEFAULT_FALLBACK_MODELS:
        if m not in model_queue:
            model_queue.append(m)

    for model_name in model_queue:
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
