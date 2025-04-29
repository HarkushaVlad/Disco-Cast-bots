import OpenAI from 'openai';

export class AiRequestService {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly configText: string;

  constructor(apiKey: string, model: string, configText: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.configText = configText;
  }

  async execRequest(sourceText: string, requestText: string): Promise<string> {
    const instructions =
      requestText && this.configText
        ? `${requestText}\n${this.configText}`
        : requestText || this.configText;

    const response = await this.client.responses.create({
      model: this.model,
      instructions,
      input: sourceText,
    });

    return (response.output_text || sourceText).trim();
  }
}
