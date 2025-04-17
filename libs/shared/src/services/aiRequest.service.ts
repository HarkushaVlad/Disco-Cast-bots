export class AiRequestService {
  private readonly AI_API_URL: string;
  private readonly AI_API_KEY: string;
  private readonly AI_MODEL: string;
  private readonly AI_TEMPERATURE: number;
  private readonly AI_CONFIG_TEXT: string;

  constructor(
    aiApiUrl: string,
    aiApiKey: string,
    aiModel: string,
    aiTemperature: number,
    configText: string
  ) {
    this.AI_API_URL = aiApiUrl;
    this.AI_API_KEY = aiApiKey;
    this.AI_MODEL = aiModel;
    this.AI_TEMPERATURE = aiTemperature;
    this.AI_CONFIG_TEXT = configText;
  }

  async execRequest(sourceText: string, requestText: string): Promise<string> {
    const messages = [
      { role: 'system', content: requestText + '\n' + this.AI_CONFIG_TEXT },
      { role: 'user', content: sourceText },
    ];

    try {
      const response = await fetch(this.AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.AI_MODEL,
          messages: messages,
          temperature: this.AI_TEMPERATURE,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `AI API responded with error (${response.status}): ${errorText}`
        );
        return sourceText;
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse AI response as JSON:', responseText);
        return sourceText;
      }

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Unexpected AI response structure:', data);
        return sourceText;
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error in AI request:', error);
      return sourceText;
    }
  }
}
