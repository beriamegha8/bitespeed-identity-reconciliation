import { prisma } from '../utils/database';
import { IdentifyRequest, IdentifyResponse, Contact } from '../types';

export class IdentityService {
  async identifyContact(request: IdentifyRequest): Promise<IdentifyResponse> {
    const { email, phoneNumber } = request;
      // Phone number is already a string from the controller
    const phoneStr = phoneNumber;

    // Validate input
    if (!email && !phoneStr) {
      throw new Error('Either email or phoneNumber must be provided');
    }

    // Find existing contacts
    const existingContacts = await this.findExistingContacts(email, phoneStr);

    if (existingContacts.length === 0) {
      // No existing contact, create new primary contact
      const newContact = await this.createPrimaryContact(email, phoneStr);
      return this.formatResponse([newContact]);
    }

    // Check if we need to create a new secondary contact
    const needsNewSecondary = this.shouldCreateSecondaryContact(
      existingContacts,
      email,
      phoneStr
    );

    if (needsNewSecondary) {
      const primaryContact = this.findOldestPrimary(existingContacts);
      const newSecondary = await this.createSecondaryContact(
        email,
        phoneStr,
        primaryContact.id
      );
      existingContacts.push(newSecondary);
    }

    // Check if we need to consolidate contacts
    const consolidatedContacts = await this.consolidateContacts(existingContacts);

    return this.formatResponse(consolidatedContacts);
  }
  private async findExistingContacts(
    email?: string,
    phoneNumber?: string
  ): Promise<Contact[]> {
    const whereConditions: { email?: string; phoneNumber?: string }[] = [];

    if (email) {
      whereConditions.push({ email });
    }
    if (phoneNumber) {
      whereConditions.push({ phoneNumber });
    }

    const initialContacts = await prisma.contact.findMany({
      where: {
        OR: whereConditions,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
    
    const contacts = initialContacts.map(contact => {
      if (!this.isValidLinkPrecedence(contact.linkPrecedence)) {
        throw new Error(`Invalid linkPrecedence value: ${contact.linkPrecedence}`);
      }
      return { ...contact, linkPrecedence: contact.linkPrecedence as 'primary' | 'secondary' };
    });

    // Get all linked contacts
    const allContactIds = new Set<number>();
    const processedIds = new Set<number>();

    for (const contact of contacts) {
      await this.getAllLinkedContacts(contact, allContactIds, processedIds);
    }

    if (allContactIds.size === 0) {
      return contacts;
    }

    const linkedContacts = await prisma.contact.findMany({
      where: {
        id: { in: Array.from(allContactIds) },
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    return linkedContacts.map(contact => {
      if (!this.isValidLinkPrecedence(contact.linkPrecedence)) {
        throw new Error(`Invalid linkPrecedence value: ${contact.linkPrecedence}`);
      }
      return { ...contact, linkPrecedence: contact.linkPrecedence as 'primary' | 'secondary' };
    });
  }

  private async getAllLinkedContacts(
    contact: Contact,
    allIds: Set<number>,
    processed: Set<number>
  ): Promise<void> {
    if (processed.has(contact.id)) return;

    processed.add(contact.id);
    allIds.add(contact.id);

    // Get the root primary contact
    let rootId = contact.linkedId || contact.id;
    if (contact.linkPrecedence === 'secondary' && contact.linkedId) {
      const primary = await prisma.contact.findUnique({
        where: { id: contact.linkedId },
      });
      if (primary && !processed.has(primary.id)) {
        allIds.add(primary.id);
        processed.add(primary.id);
        rootId = primary.id;
      }
    }    // Get all contacts linked to this root
    const prismaLinkedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { linkedId: rootId },
          { id: rootId },
        ],
        deletedAt: null,
      },
    });

    const linkedContacts = prismaLinkedContacts.map(contact => {
      if (!this.isValidLinkPrecedence(contact.linkPrecedence)) {
        throw new Error(`Invalid linkPrecedence value: ${contact.linkPrecedence}`);
      }
      return { ...contact, linkPrecedence: contact.linkPrecedence as 'primary' | 'secondary' };
    });

    for (const linked of linkedContacts) {
      if (!processed.has(linked.id)) {
        allIds.add(linked.id);
        processed.add(linked.id);
      }
    }
  }
  private shouldCreateSecondaryContact(
    existingContacts: Contact[],
    email?: string,
    phoneNumber?: string
  ): boolean {
    const hasEmail = email ? existingContacts.some(c => c.email === email) : false;
    const hasPhone = phoneNumber ? existingContacts.some(c => c.phoneNumber === phoneNumber) : false;

    // If we have both email and phone, and at least one is new, create secondary
    if (email && phoneNumber) {
      return !hasEmail || !hasPhone;
    }

    // If we only have email or phone, and it doesn't exist, create secondary
    if (email) {
      return !hasEmail;
    }
    if (phoneNumber) {
      return !hasPhone;
    }
    return false;
  }

  private findOldestPrimary(contacts: Contact[]): Contact {
    const primaries = contacts.filter(c => c.linkPrecedence === 'primary');
    return primaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  }

  private async consolidateContacts(contacts: Contact[]): Promise<Contact[]> {
    const primaries = contacts.filter(c => c.linkPrecedence === 'primary');
    
    if (primaries.length <= 1) {
      return contacts;
    }

    // Find the oldest primary
    const oldestPrimary = primaries.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )[0];

    // Convert other primaries to secondary
    const toUpdate = primaries.filter(p => p.id !== oldestPrimary.id);
    
    for (const contact of toUpdate) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          linkedId: oldestPrimary.id,
          linkPrecedence: 'secondary',
        },
      });

      // Update any contacts that were linked to this contact
      await prisma.contact.updateMany({
        where: { linkedId: contact.id },
        data: { linkedId: oldestPrimary.id },
      });
    }

    // Fetch updated contacts
    return await this.findExistingContacts(
      oldestPrimary.email || undefined,
      oldestPrimary.phoneNumber || undefined
    );
  }
  private async createPrimaryContact(
    email?: string,
    phoneNumber?: string
  ): Promise<Contact> {
    const contact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'primary',
      },
    });

    if (!this.isValidLinkPrecedence(contact.linkPrecedence)) {
      throw new Error(`Invalid linkPrecedence value: ${contact.linkPrecedence}`);
    }

    return { ...contact, linkPrecedence: contact.linkPrecedence as 'primary' | 'secondary' };
  }
  private async createSecondaryContact(
    email: string | undefined,
    phoneNumber: string | undefined,
    linkedId: number
  ): Promise<Contact> {
    const contact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId,
        linkPrecedence: 'secondary',
      },
    });

    if (!this.isValidLinkPrecedence(contact.linkPrecedence)) {
      throw new Error(`Invalid linkPrecedence value: ${contact.linkPrecedence}`);
    }

    return { ...contact, linkPrecedence: contact.linkPrecedence as 'primary' | 'secondary' };
  }

  private formatResponse(contacts: Contact[]): IdentifyResponse {
    const primary = contacts.find(c => c.linkPrecedence === 'primary');
    const secondaries = contacts.filter(c => c.linkPrecedence === 'secondary');

    if (!primary) {
      throw new Error('No primary contact found');
    }    const emails = Array.from(
      new Set(
        contacts
          .map(c => c.email)
          .filter((email): email is string => email !== null)
          .sort()
      )
    );

    const phoneNumbers = Array.from(
      new Set(
        contacts
          .map(c => c.phoneNumber)
          .filter((phone): phone is string => phone !== null)
          .sort()
      )
    );

    return {      contact: {
        primaryContactId: primary.id,
        emails,
        phoneNumbers,
        secondaryContactIds: secondaries.map(c => c.id).sort(),
      },
    };
  }

  private isValidLinkPrecedence(value: string): value is 'primary' | 'secondary' {
    return value === 'primary' || value === 'secondary';
  }
}