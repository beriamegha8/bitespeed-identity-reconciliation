import { Request, Response } from 'express';
import { IdentityService } from '../services/identityService';
import { IdentifyRequest } from '../types';

export class IdentityController {
  private identityService: IdentityService;

  constructor() {
    this.identityService = new IdentityService();
  }

  async identify(req: Request, res: Response): Promise<void> {
    try {
      const { email, phoneNumber } = req.body;

      // Validate input
      if (!email && (phoneNumber === undefined || phoneNumber === null)) {
        res.status(400).json({
          error: 'Either email or phoneNumber must be provided',
        });
        return;
      }

      // Convert phoneNumber to string if it exists
      let phoneStr: string | undefined;
      if (phoneNumber !== undefined && phoneNumber !== null) {
        phoneStr = phoneNumber.toString();
      }

      // Prepare request object with properly typed data
      const identifyRequest: IdentifyRequest = {
        email: email || undefined,
        phoneNumber: phoneStr,
      };

      // Process request
      const result = await this.identityService.identifyContact(identifyRequest);
      res.status(200).json(result);
    } catch (error) {
      // Log error but don't expose details to client
      if (error instanceof Error) {
        console.error('Error in identify endpoint:', error.message);
      } else {
        console.error('Unknown error in identify endpoint');
      }
      
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}