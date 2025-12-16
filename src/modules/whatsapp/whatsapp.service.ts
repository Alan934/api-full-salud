import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class WhatsAppService {
  private logger = new Logger(WhatsAppService.name);

  constructor() {}

  async getQRCode() {
    const externalQrEndpoint = 'https://fullsalud-productomonolito-production.up.railway.app/api/bot/qrcode/4'
    this.logger.log(`Fetching QR code image from ${externalQrEndpoint}`);

    try {
      const response = await fetch(externalQrEndpoint);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      this.logger.log(`Successfully fetched QR code image. Content-Type: ${contentType}`);

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      return { buffer: imageBuffer, contentType: contentType };

    } catch (error: any) {
      this.logger.error(
        `Error fetching QR code image: ${error.message}`,
        error.stack,
      );
      return null; // Indicate failure by returning null
    }
  }

  async sendMessage(to: string, message: string): Promise<void> {
    const baseUrl = 'https://fullsalud-productomonolito-production.up.railway.app/api/bot/send-message';
    const encodedTo = encodeURIComponent(to);
    const encodedMessage = encodeURIComponent(message);
    const externalUrl = `${baseUrl}?to=${encodedTo}&message=${encodedMessage}`;

    const maxRetries = 5;
    const retryDelayMs = 2000;
    const requestTimeoutMs = 15000; // Timeout for each attempt

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.logger.log(`Sending message via POST to: ${externalUrl} (Attempt ${attempt}/${maxRetries})`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

      try {
        const response = await fetch(externalUrl, {
          method: 'POST',
          headers: { 'Accept': '*/*' },
          signal: controller.signal, // Add signal for timeout
        });

        clearTimeout(timeoutId); // Clear timeout if fetch completes

        if (response.ok) { // Checks for 200-299 status codes
          this.logger.log(`Successfully sent message request. Status: ${response.status} (Attempt ${attempt})`);
          return; // Success, exit the function
        } else {
          this.logger.warn(`External endpoint returned non-success status: ${response.status} (Attempt ${attempt})`);
          // Consider logging response body if helpful: await response.text()
          if (attempt === maxRetries) {
             throw new Error(`Received status ${response.status} after ${maxRetries} attempts.`);
          }
        }

      } catch (error: any) {
        clearTimeout(timeoutId); // Clear timeout if fetch fails
        this.logger.error(`Attempt ${attempt} failed. Error: ${error.message}`, error.stack);

        if (attempt === maxRetries) {
          this.logger.error(`Max retries (${maxRetries}) reached. Giving up.`);
          throw new Error(`Failed to send message via external endpoint after ${maxRetries} attempts: ${error.message}`);
        }

        // Wait before the next retry
        this.logger.log(`Waiting ${retryDelayMs}ms before next attempt...`);
        await delay(retryDelayMs);

      } // End catch block
    } // End for loop
  }

  async disconnect(): Promise<void> {
    const externalUrl = 'https://fullsalud-productomonolito-production.up.railway.app/api/bot/disconnect';
    this.logger.log(`Sending disconnect request via POST to: ${externalUrl}`);

    try {
      const response = await fetch(externalUrl, {
        method: 'POST',
        // body: null, // fetch handles null body correctly for POST
        // headers: { ... } // Add headers if needed
      });

      if (response.ok) {
        this.logger.log(`Successfully sent disconnect request to external endpoint. Status: ${response.status}`);
      } else {
        this.logger.warn(`External disconnect endpoint returned unexpected status: ${response.status}`);
        // Optional: Log response body for debugging
        // const responseBody = await response.text();
        // this.logger.error(`Response body: ${responseBody}`);
        throw new Error(`Received status ${response.status}`);
      }

    } catch (error: any) {
      this.logger.error(
        `Error sending disconnect request: ${error.message}`,
        error.stack,
      );
      // Re-throw the error to be handled by the caller
      throw new Error(`Failed to send disconnect request via external endpoint: ${error.message}`);
    }
  }
}
