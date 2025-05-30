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

      // Basic email validation
      if (email && !this.isValidEmail(email)) {
        res.status(400).json({
          error: 'Invalid email format',
        });
        return;
      }

      // Validate phone number type and format
      if (phoneNumber !== undefined && phoneNumber !== null) {
        if (typeof phoneNumber !== 'number') {
          res.status(400).json({
            error: 'phoneNumber must be a number',
          });
          return;
        }
        if (!this.isValidPhoneNumber(phoneNumber)) {
          res.status(400).json({
            error: 'Invalid phone number format',
          });
          return;
        }
      }      // Convert phone number to string for database storage
      const input: IdentifyRequest = {
        email: email || undefined,
        phoneNumber: phoneNumber !== undefined && phoneNumber !== null ? String(phoneNumber) : undefined
      };

      const result = await this.identityService.identifyContact(input);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in identify endpoint:', error);
      
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }  private isValidPhoneNumber(phoneNumber: number): boolean {
    // Convert to string and check length (allowing shorter numbers for testing)
    const phoneStr = phoneNumber.toString();
    return phoneStr.length >= 1;
  }
}