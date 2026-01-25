import json
import base64
from openai import OpenAI
from lib.secrets import get_openai_api_key

MENU_EXTRACTION_PROMPT = """You are a menu parser. Extract all dishes from this restaurant menu image.

Return JSON in this exact format:
{
  "restaurant_name": "string or null",
  "sections": [
    {
      "name": "section name",
      "dishes": [
        {
          "name": "dish name",
          "description": "description or null",
          "price": number or null,
          "dietary": ["vegetarian", "vegan", "gluten-free", "spicy", etc]
        }
      ]
    }
  ]
}

Rules:
- Extract ALL dishes visible in the image
- Preserve menu section organization
- Include prices as numbers (e.g., 12.99 not "$12.99")
- Infer dietary tags from description when obvious
- If multiple pages, process all
- Return ONLY valid JSON, no markdown or explanations"""

RECOMMENDATION_PROMPT = """You are a dining advisor helping plan what to order at a restaurant.

Menu:
{menu_json}

Context:
- Vibe: {vibe}
- Group size: {group_size}
- Dietary restrictions: {dietary}
- Adventurousness: {adventurousness} (low/medium/high)
- Budget sensitivity: {budget} (low/moderate/high)

Create an ordering plan. Return JSON:
{{
  "plan": {{
    "shareables": number,
    "mains": number,
    "dessert": number,
    "reasoning": "brief explanation of quantities"
  }},
  "recommendations": [
    {{
      "dish": "dish name",
      "category": "shareable|main|dessert",
      "reason": "why this dish fits the occasion",
      "for_whom": "optional - e.g., 'for the vegetarian'"
    }}
  ],
  "avoid": [
    {{
      "dish": "dish name",
      "reason": "why to skip"
    }}
  ]
}}

Return ONLY valid JSON, no markdown or explanations."""


def get_client() -> OpenAI:
    """Get an OpenAI client."""
    return OpenAI(api_key=get_openai_api_key())


def extract_menu_from_images(image_data_list: list[tuple[bytes, str]]) -> dict:
    """
    Extract menu information from images using GPT-4o vision.

    Args:
        image_data_list: List of tuples (image_bytes, content_type)

    Returns:
        Extracted menu data as a dictionary
    """
    client = get_client()

    # Build content list with images
    content = []

    for image_bytes, content_type in image_data_list:
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        media_type = content_type or "image/jpeg"

        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{media_type};base64,{base64_image}",
                "detail": "auto"
            }
        })

    content.append({
        "type": "text",
        "text": MENU_EXTRACTION_PROMPT
    })

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": content
            }
        ],
        max_tokens=4096,
        temperature=0.1,
    )

    # Parse the response
    result_text = response.choices[0].message.content

    # Try to extract JSON from the response
    try:
        # Handle potential markdown code blocks
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0]
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0]

        return json.loads(result_text.strip())
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse menu extraction result: {e}")


def get_recommendations(
    menu: dict,
    vibe: str,
    group_size: int,
    dietary: list[str],
    adventurousness: str,
    budget: str,
) -> dict:
    """
    Get ordering recommendations based on menu and preferences.

    Args:
        menu: Extracted menu data
        vibe: Occasion type (date_night, friends, family, business)
        group_size: Number of people
        dietary: List of dietary restrictions
        adventurousness: low, medium, or high
        budget: low, moderate, or high

    Returns:
        Recommendation data as a dictionary
    """
    client = get_client()

    prompt = RECOMMENDATION_PROMPT.format(
        menu_json=json.dumps(menu, indent=2),
        vibe=vibe,
        group_size=group_size,
        dietary=", ".join(dietary) if dietary else "none",
        adventurousness=adventurousness,
        budget=budget,
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        max_tokens=2048,
        temperature=0.7,
    )

    result_text = response.choices[0].message.content

    try:
        # Handle potential markdown code blocks
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0]
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0]

        return json.loads(result_text.strip())
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse recommendation result: {e}")
