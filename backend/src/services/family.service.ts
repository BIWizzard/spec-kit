import { prisma } from '../lib/prisma';
import { Family, FamilyMember, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

export type CreateFamilyData = {
  name: string;
  settings: {
    timezone: string;
    currency: string;
    fiscalYearStart: number;
  };
  adminUser: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
};

export type UpdateFamilyData = {
  name?: string;
  settings?: Partial<{
    timezone: string;
    currency: string;
    fiscalYearStart: number;
  }>;
  subscriptionStatus?: 'trial' | 'active' | 'suspended' | 'cancelled';
  dataRetentionConsent?: boolean;
};

export class FamilyService {
  static async createFamily(data: CreateFamilyData): Promise<Family & { members: FamilyMember[] }> {
    const passwordHash = await bcrypt.hash(data.adminUser.password, 12);

    return prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: {
          name: data.name,
          settings: data.settings,
          subscriptionStatus: 'trial',
          dataRetentionConsent: true,
          members: {
            create: {
              email: data.adminUser.email,
              passwordHash,
              firstName: data.adminUser.firstName,
              lastName: data.adminUser.lastName,
              role: 'admin',
              permissions: {
                canManageBankAccounts: true,
                canEditPayments: true,
                canViewReports: true,
                canManageFamily: true,
              },
              mfaEnabled: false,
              emailVerified: false,
            },
          },
        },
        include: {
          members: true,
        },
      });

      return family;
    });
  }

  static async getFamilyById(id: string): Promise<Family | null> {
    return prisma.family.findUnique({
      where: { id },
    });
  }

  static async getFamilyWithMembers(id: string): Promise<(Family & { members: FamilyMember[] }) | null> {
    return prisma.family.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            deletedAt: null,
          },
        },
      },
    });
  }

  static async updateFamily(id: string, data: UpdateFamilyData): Promise<Family> {
    const updateData: Prisma.FamilyUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.subscriptionStatus !== undefined) updateData.subscriptionStatus = data.subscriptionStatus;
    if (data.dataRetentionConsent !== undefined) updateData.dataRetentionConsent = data.dataRetentionConsent;

    if (data.settings) {
      const currentFamily = await prisma.family.findUnique({
        where: { id },
        select: { settings: true },
      });

      if (!currentFamily) {
        throw new Error('Family not found');
      }

      updateData.settings = {
        ...(currentFamily.settings as object),
        ...data.settings,
      };
    }

    return prisma.family.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteFamilyMember(familyId: string, memberId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const member = await tx.familyMember.findFirst({
        where: {
          id: memberId,
          familyId,
          deletedAt: null,
        },
      });

      if (!member) {
        throw new Error('Member not found or already deleted');
      }

      if (member.role === 'admin') {
        const adminCount = await tx.familyMember.count({
          where: {
            familyId,
            role: 'admin',
            deletedAt: null,
          },
        });

        if (adminCount <= 1) {
          throw new Error('Cannot delete the last admin member');
        }
      }

      await tx.familyMember.update({
        where: { id: memberId },
        data: { deletedAt: new Date() },
      });
    });
  }

  static async inviteFamilyMember(
    familyId: string,
    inviterMemberId: string,
    data: {
      email: string;
      role: 'admin' | 'editor' | 'viewer';
      permissions?: Partial<{
        canManageBankAccounts: boolean;
        canEditPayments: boolean;
        canViewReports: boolean;
        canManageFamily: boolean;
      }>;
    }
  ): Promise<{ invitationId: string; token: string }> {
    const inviter = await prisma.familyMember.findFirst({
      where: {
        id: inviterMemberId,
        familyId,
        deletedAt: null,
      },
    });

    if (!inviter) {
      throw new Error('Inviter not found or not authorized');
    }

    if (!inviter.permissions.canManageFamily) {
      throw new Error('Insufficient permissions to invite members');
    }

    const existingMember = await prisma.familyMember.findFirst({
      where: {
        email: data.email,
        familyId,
        deletedAt: null,
      },
    });

    if (existingMember) {
      throw new Error('User is already a member of this family');
    }

    const defaultPermissions = {
      canManageBankAccounts: data.role === 'admin',
      canEditPayments: data.role === 'admin' || data.role === 'editor',
      canViewReports: true,
      canManageFamily: data.role === 'admin',
    };

    const invitationToken = crypto.randomUUID();

    const member = await prisma.familyMember.create({
      data: {
        familyId,
        email: data.email,
        passwordHash: '',
        firstName: '',
        lastName: '',
        role: data.role,
        permissions: { ...defaultPermissions, ...data.permissions },
        mfaEnabled: false,
        emailVerified: false,
      },
    });

    return {
      invitationId: member.id,
      token: invitationToken,
    };
  }

  static async updateFamilyMember(
    familyId: string,
    memberId: string,
    updaterId: string,
    data: {
      role?: 'admin' | 'editor' | 'viewer';
      permissions?: Partial<{
        canManageBankAccounts: boolean;
        canEditPayments: boolean;
        canViewReports: boolean;
        canManageFamily: boolean;
      }>;
    }
  ): Promise<FamilyMember> {
    const updater = await prisma.familyMember.findFirst({
      where: {
        id: updaterId,
        familyId,
        deletedAt: null,
      },
    });

    if (!updater || !updater.permissions.canManageFamily) {
      throw new Error('Insufficient permissions to update family members');
    }

    const member = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        familyId,
        deletedAt: null,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    if (data.role === 'admin' && member.role !== 'admin') {
      const adminCount = await prisma.familyMember.count({
        where: {
          familyId,
          role: 'admin',
          deletedAt: null,
        },
      });

      if (adminCount >= 3) {
        throw new Error('Maximum of 3 admin members allowed per family');
      }
    }

    const updateData: Prisma.FamilyMemberUpdateInput = {};
    if (data.role !== undefined) updateData.role = data.role;

    if (data.permissions) {
      updateData.permissions = {
        ...(member.permissions as object),
        ...data.permissions,
      };
    }

    return prisma.familyMember.update({
      where: { id: memberId },
      data: updateData,
    });
  }

  static async getFamilyActivity(
    familyId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    return prisma.auditLog.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        familyMember: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  static async getFamilyMemberCount(familyId: string): Promise<number> {
    return prisma.familyMember.count({
      where: {
        familyId,
        deletedAt: null,
      },
    });
  }
}