export class AiRequestService {
  private readonly AI_API_URL: string;
  private readonly AI_CONFIG_TEXT: string;

  constructor(aiApiUrl: string, configText: string) {
    this.AI_API_URL = aiApiUrl;
    this.AI_CONFIG_TEXT = configText;
  }

  async execRequest(sourceText: string, requestText: string): Promise<string> {
    const prompt =
      requestText && this.AI_CONFIG_TEXT
        ? `${requestText}\n${this.AI_CONFIG_TEXT}`
        : requestText || this.AI_CONFIG_TEXT;

    try {
      const response = await fetch(this.AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }, { text: sourceText }],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI API error (${response.status}): ${errorText}`);
        return sourceText;
      }

      const data = await response.json();

      const result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!result) {
        console.error('Unexpected AI response structure:', data);
        return sourceText;
      }

      return result;
    } catch (error) {
      console.error('Error in AI request:', error);
      return sourceText;
    }
  }
}
