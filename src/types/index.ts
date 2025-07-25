export interface IdentifyRequest {
    email?: string;
    phoneNumber?: string;
  }
  
  export interface IdentifyResponse {
    contact: {
      primaryContactId: number;  // Fixed typo
      emails: string[];
      phoneNumbers: string[];
      secondaryContactIds: number[];
    };
  }
  export interface Contact {
    id: number;
    phoneNumber: string | null;
    email: string | null;
    linkedId: number | null;
    linkPrecedence: 'primary' | 'secondary';
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }
  
  export type LinkPrecedence = 'primary' | 'secondary';