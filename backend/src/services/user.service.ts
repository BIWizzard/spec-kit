import { prisma } from '../lib/prisma';
import { FamilyMember, Session } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticator } from 'otplib';

export type LoginCredentials = {
  email: string;
  password: string;
  mfaToken?: string;
};

export type RegisterData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  invitationToken?: string;
};

export type UpdateProfileData = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export type ChangePasswordData = {
  currentPassword: string;
  newPassword: string;
};

export type MfaSetupResult = {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
};

export class UserService {
  static async authenticate(credentials: LoginCredentials, userAgent: string, ipAddress: string): Promise<{ user: FamilyMember; session: Session } | null> {
    const user = await prisma.familyMember.findUnique({
      where: {
        email: credentials.email,
        deletedAt: null,
      },
    });

    if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
      return null;
    }

    if (user.mfaEnabled) {
      if (!credentials.mfaToken) {
        throw new Error('MFA token required');
      }

      if (!user.mfaSecret) {
        throw new Error('MFA not properly configured');
      }

      const isValidToken = authenticator.verify({
        token: credentials.mfaToken,
        secret: user.mfaSecret,
      });

      if (!isValidToken) {
        throw new Error('Invalid MFA token');
      }
    }

    if (!user.emailVerified) {
      throw new Error('Email not verified');
    }

    await prisma.familyMember.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await prisma.session.create({
      data: {
        familyMemberId: user.id,
        token: crypto.randomUUID(),
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    await this.logAuditEvent(user.familyId, user.id, 'login', 'Session', session.id, {}, { ipAddress });

    return { user, session };
  }

  static async register(data: RegisterData): Promise<{ user: FamilyMember; verificationToken: string }> {
    if (data.invitationToken) {
      return this.acceptInvitation(data.invitationToken, data);
    }

    const existingUser = await prisma.familyMember.findUnique({
      where: { email: data.email },
    });

    if (existingUser && existingUser.deletedAt === null) {
      throw new Error('User already exists with this email');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const verificationToken = crypto.randomUUID();

    const user = await prisma.familyMember.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'admin',
        permissions: {
          canManageBankAccounts: true,
          canEditPayments: true,
          canViewReports: true,
          canManageFamily: true,
        },
        mfaEnabled: false,
        emailVerified: false,
        family: {
          create: {
            name: `${data.firstName}'s Family`,
            settings: {
              timezone: 'America/New_York',
              currency: 'USD',
              fiscalYearStart: 1,
            },
            subscriptionStatus: 'trial',
            dataRetentionConsent: true,
          },
        },
      },
    });

    return { user, verificationToken };
  }

  static async acceptInvitation(invitationToken: string, userData: Omit<RegisterData, 'invitationToken'>): Promise<{ user: FamilyMember; verificationToken: string }> {
    const invitation = await prisma.familyMember.findFirst({
      where: {
        email: userData.email,
        passwordHash: '',
        deletedAt: null,
      },
    });

    if (!invitation) {
      throw new Error('Invalid invitation or invitation already accepted');
    }

    const passwordHash = await bcrypt.hash(userData.password, 12);
    const verificationToken = crypto.randomUUID();

    const user = await prisma.familyMember.update({
      where: { id: invitation.id },
      data: {
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        emailVerified: false,
      },
    });

    await this.logAuditEvent(user.familyId, user.id, 'create', 'FamilyMember', user.id, {}, {
      action: 'invitation_accepted',
      invitedEmail: userData.email,
    });

    return { user, verificationToken };
  }

  static async verifyEmail(userId: string, token: string): Promise<void> {
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await prisma.familyMember.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    await this.logAuditEvent(user.familyId, user.id, 'update', 'FamilyMember', user.id,
      { emailVerified: false },
      { emailVerified: true }
    );
  }

  static async setupMfa(userId: string): Promise<MfaSetupResult> {
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const secret = authenticator.generateSecret();
    const serviceName = 'Family Finance App';
    const label = `${serviceName} (${user.email})`;

    const qrCodeUrl = authenticator.keyuri(user.email, serviceName, secret);
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    await prisma.familyMember.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  static async enableMfa(userId: string, token: string): Promise<void> {
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaSecret) {
      throw new Error('MFA not set up');
    }

    const isValidToken = authenticator.verify({
      token,
      secret: user.mfaSecret,
    });

    if (!isValidToken) {
      throw new Error('Invalid MFA token');
    }

    await prisma.familyMember.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    await this.logAuditEvent(user.familyId, user.id, 'update', 'FamilyMember', user.id,
      { mfaEnabled: false },
      { mfaEnabled: true }
    );
  }

  static async disableMfa(userId: string, password: string): Promise<void> {
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new Error('Invalid password');
    }

    await prisma.familyMember.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    await this.logAuditEvent(user.familyId, user.id, 'update', 'FamilyMember', user.id,
      { mfaEnabled: true },
      { mfaEnabled: false }
    );
  }

  static async updateProfile(userId: string, data: UpdateProfileData): Promise<FamilyMember> {
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const oldValues = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    const updatedUser = await prisma.familyMember.update({
      where: { id: userId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email && { email: data.email, emailVerified: false }),
      },
    });

    await this.logAuditEvent(user.familyId, user.id, 'update', 'FamilyMember', user.id,
      oldValues,
      data
    );

    return updatedUser;
  }

  static async changePassword(userId: string, data: ChangePasswordData): Promise<void> {
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
      throw new Error('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, 12);

    await prisma.familyMember.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await prisma.session.deleteMany({
      where: { familyMemberId: userId },
    });

    await this.logAuditEvent(user.familyId, user.id, 'update', 'FamilyMember', user.id,
      {},
      { action: 'password_changed' }
    );
  }

  static async forgotPassword(email: string): Promise<string> {
    const user = await prisma.familyMember.findUnique({
      where: {
        email,
        deletedAt: null,
      },
    });

    if (!user) {
      return crypto.randomUUID();
    }

    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    return resetToken;
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 12);
  }

  static async logout(sessionToken: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { familyMember: true },
    });

    if (!session) {
      return;
    }

    await prisma.session.delete({
      where: { token: sessionToken },
    });

    await this.logAuditEvent(
      session.familyMember.familyId,
      session.familyMemberId,
      'logout',
      'Session',
      session.id,
      {},
      { logoutTime: new Date() }
    );
  }

  static async getUserSessions(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: {
        familyMemberId: userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async deleteAllSessions(userId: string): Promise<void> {
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await prisma.session.deleteMany({
      where: { familyMemberId: userId },
    });

    await this.logAuditEvent(user.familyId, user.id, 'delete', 'Session', 'all',
      {},
      { action: 'all_sessions_deleted' }
    );
  }

  static async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        familyMemberId: userId,
      },
      include: { familyMember: true },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    await prisma.session.delete({
      where: { id: sessionId },
    });

    await this.logAuditEvent(
      session.familyMember.familyId,
      userId,
      'delete',
      'Session',
      sessionId,
      {},
      { sessionDeleted: true }
    );
  }

  static async validateSession(token: string): Promise<FamilyMember | null> {
    const session = await prisma.session.findUnique({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: {
        familyMember: {
          where: { deletedAt: null },
        },
      },
    });

    if (!session || !session.familyMember) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    return session.familyMember;
  }

  static async getUserWithFamily(userId: string): Promise<(FamilyMember & { family: any }) | null> {
    return prisma.familyMember.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
      include: {
        family: true,
      },
    });
  }

  static async getSessionById(sessionId: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { id: sessionId },
    });
  }

  private static async logAuditEvent(
    familyId: string,
    memberId: string,
    action: 'create' | 'update' | 'delete' | 'login' | 'logout',
    entityType: string,
    entityId: string,
    oldValues: object,
    newValues: object
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        familyId,
        familyMemberId: memberId,
        action,
        entityType,
        entityId,
        oldValues,
        newValues,
        ipAddress: '',
      },
    });
  }
}