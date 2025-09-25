import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { UserService, LoginCredentials, RegisterData } from '../../backend/src/services/user.service';
import { prisma } from '../../backend/src/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticator } from 'otplib';

jest.mock('../../backend/src/lib/prisma', () => ({
  prisma: {
    familyMember: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs');
jest.mock('crypto');
jest.mock('otplib');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockCrypto = crypto as jest.Mocked<typeof crypto>;
const mockAuthenticator = authenticator as jest.Mocked<typeof authenticator>;

describe('UserService - Authentication Helpers', () => {
  const userId = 'user-123';
  const familyId = 'family-123';
  const sessionToken = 'session-token-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockCrypto.randomUUID.mockReturnValue('random-uuid-123');
    mockCrypto.randomBytes.mockReturnValue(Buffer.from('1234', 'hex'));
    mockPrisma.auditLog.create.mockResolvedValue({} as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Authentication', () => {
    test('should authenticate user with valid credentials', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        familyId,
        mfaEnabled: false,
        emailVerified: true,
        firstName: 'John',
        lastName: 'Doe',
        deletedAt: null,
      };

      const mockSession = {
        id: 'session-123',
        familyMemberId: userId,
        token: sessionToken,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.familyMember.update.mockResolvedValue(mockUser as any);
      mockPrisma.session.create.mockResolvedValue(mockSession as any);

      const result = await UserService.authenticate(credentials, 'test-agent', '127.0.0.1');

      expect(result).toBeDefined();
      expect(result?.user.email).toBe('test@example.com');
      expect(result?.session.token).toBe(sessionToken);
      expect(mockPrisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });

    test('should reject authentication with invalid password', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        deletedAt: null,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await UserService.authenticate(credentials, 'test-agent', '127.0.0.1');

      expect(result).toBeNull();
      expect(mockPrisma.session.create).not.toHaveBeenCalled();
    });

    test('should reject authentication for non-existent user', async () => {
      const credentials: LoginCredentials = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      const result = await UserService.authenticate(credentials, 'test-agent', '127.0.0.1');

      expect(result).toBeNull();
    });

    test('should require MFA token when MFA is enabled', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        mfaEnabled: true,
        mfaSecret: 'mfa-secret',
        emailVerified: true,
        deletedAt: null,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);

      await expect(
        UserService.authenticate(credentials, 'test-agent', '127.0.0.1')
      ).rejects.toThrow('MFA token required');
    });

    test('should validate MFA token when provided', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
        mfaToken: '123456',
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        familyId,
        mfaEnabled: true,
        mfaSecret: 'mfa-secret',
        emailVerified: true,
        deletedAt: null,
      };

      const mockSession = {
        id: 'session-123',
        familyMemberId: userId,
        token: sessionToken,
        createdAt: new Date(),
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockAuthenticator.verify.mockReturnValue(true);
      mockPrisma.familyMember.update.mockResolvedValue(mockUser as any);
      mockPrisma.session.create.mockResolvedValue(mockSession as any);

      const result = await UserService.authenticate(credentials, 'test-agent', '127.0.0.1');

      expect(result).toBeDefined();
      expect(mockAuthenticator.verify).toHaveBeenCalledWith({
        token: '123456',
        secret: 'mfa-secret',
      });
    });

    test('should reject invalid MFA token', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
        mfaToken: '000000',
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        mfaEnabled: true,
        mfaSecret: 'mfa-secret',
        emailVerified: true,
        deletedAt: null,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockAuthenticator.verify.mockReturnValue(false);

      await expect(
        UserService.authenticate(credentials, 'test-agent', '127.0.0.1')
      ).rejects.toThrow('Invalid MFA token');
    });

    test('should reject authentication for unverified email', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        mfaEnabled: false,
        emailVerified: false,
        deletedAt: null,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);

      await expect(
        UserService.authenticate(credentials, 'test-agent', '127.0.0.1')
      ).rejects.toThrow('Email not verified');
    });
  });

  describe('User Registration', () => {
    test('should register new user and create family', async () => {
      const registerData: RegisterData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const mockUser = {
        id: userId,
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        familyId,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(null); // No existing user
      mockBcrypt.hash.mockResolvedValue('hashed_password' as never);
      mockPrisma.familyMember.create.mockResolvedValue(mockUser as any);

      const result = await UserService.register(registerData);

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.verificationToken).toBe('random-uuid-123');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrisma.familyMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'admin',
          family: {
            create: expect.objectContaining({
              name: "Jane's Family",
            }),
          },
        }),
      });
    });

    test('should reject registration for existing active user', async () => {
      const registerData: RegisterData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const existingUser = {
        id: userId,
        email: 'existing@example.com',
        deletedAt: null,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(existingUser as any);

      await expect(UserService.register(registerData)).rejects.toThrow(
        'User already exists with this email'
      );
    });

    test('should handle invitation token during registration', async () => {
      const registerData: RegisterData = {
        email: 'invited@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        invitationToken: 'invite-token-123',
      };

      const acceptInvitationSpy = jest.spyOn(UserService, 'acceptInvitation');
      acceptInvitationSpy.mockResolvedValue({
        user: { id: userId } as any,
        verificationToken: 'verification-token',
      });

      const result = await UserService.register(registerData);

      expect(acceptInvitationSpy).toHaveBeenCalledWith('invite-token-123', {
        email: 'invited@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
      });

      acceptInvitationSpy.mockRestore();
    });
  });

  describe('Email Verification', () => {
    test('should verify email with valid token', async () => {
      const token = 'verification-token-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        familyId,
        emailVerified: false,
        deletedAt: null,
      };

      // Mock the private emailVerificationTokens map
      const tokenData = {
        userId,
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };

      // Use reflection to access private static property
      (UserService as any).emailVerificationTokens = new Map();
      (UserService as any).emailVerificationTokens.set(token, tokenData);

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.familyMember.update.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      } as any);

      await UserService.verifyEmail(userId, token);

      expect(mockPrisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { emailVerified: true },
      });
      expect((UserService as any).emailVerificationTokens.has(token)).toBe(false);
    });

    test('should reject expired verification token', async () => {
      const token = 'expired-token-123';

      // Mock expired token
      const tokenData = {
        userId,
        email: 'test@example.com',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired 1 hour ago
      };

      (UserService as any).emailVerificationTokens = new Map();
      (UserService as any).emailVerificationTokens.set(token, tokenData);

      await expect(UserService.verifyEmail(userId, token)).rejects.toThrow(
        'Invalid verification token'
      );

      expect((UserService as any).emailVerificationTokens.has(token)).toBe(false);
    });

    test('should reject invalid verification token', async () => {
      const token = 'invalid-token-123';

      (UserService as any).emailVerificationTokens = new Map();

      await expect(UserService.verifyEmail(userId, token)).rejects.toThrow(
        'Invalid verification token'
      );
    });

    test('should resend verification email for unverified user', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: userId,
        email,
        emailVerified: false,
        familyId,
        deletedAt: null,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);

      (UserService as any).emailVerificationTokens = new Map();

      const token = await UserService.resendVerificationEmail(email);

      expect(token).toBe('random-uuid-123');
      expect((UserService as any).emailVerificationTokens.size).toBe(1);
    });

    test('should return token even for non-existent user (prevent enumeration)', async () => {
      const email = 'nonexistent@example.com';

      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      (UserService as any).emailVerificationTokens = new Map();

      const token = await UserService.resendVerificationEmail(email);

      expect(token).toBe('random-uuid-123'); // Always returns token
      expect((UserService as any).emailVerificationTokens.size).toBe(0);
    });
  });

  describe('MFA Management', () => {
    test('should setup MFA with secret and QR code', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockAuthenticator.generateSecret.mockReturnValue('generated-secret');
      mockAuthenticator.keyuri.mockReturnValue('otpauth://totp/...');
      mockPrisma.familyMember.update.mockResolvedValue(mockUser as any);

      const result = await UserService.setupMfa(userId);

      expect(result.secret).toBe('generated-secret');
      expect(result.qrCodeUrl).toBe('otpauth://totp/...');
      expect(result.backupCodes).toHaveLength(10);
      expect(mockPrisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { mfaSecret: 'generated-secret' },
      });
    });

    test('should reject MFA setup for non-existent user', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(UserService.setupMfa(userId)).rejects.toThrow('User not found');
    });

    test('should enable MFA with valid token', async () => {
      const token = '123456';
      const mockUser = {
        id: userId,
        familyId,
        mfaSecret: 'mfa-secret',
        mfaEnabled: false,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockAuthenticator.verify.mockReturnValue(true);
      mockPrisma.familyMember.update.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
      } as any);

      await UserService.enableMfa(userId, token);

      expect(mockPrisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { mfaEnabled: true },
      });
    });

    test('should reject MFA enable with invalid token', async () => {
      const token = '000000';
      const mockUser = {
        id: userId,
        mfaSecret: 'mfa-secret',
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockAuthenticator.verify.mockReturnValue(false);

      await expect(UserService.enableMfa(userId, token)).rejects.toThrow('Invalid MFA token');
    });

    test('should disable MFA with correct password', async () => {
      const password = 'current-password';
      const mockUser = {
        id: userId,
        familyId,
        passwordHash: 'hashed-password',
        mfaEnabled: true,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.familyMember.update.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
        mfaSecret: null,
      } as any);

      await UserService.disableMfa(userId, password);

      expect(mockPrisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
        },
      });
    });

    test('should reject MFA disable with incorrect password', async () => {
      const password = 'wrong-password';
      const mockUser = {
        id: userId,
        passwordHash: 'hashed-password',
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(UserService.disableMfa(userId, password)).rejects.toThrow('Invalid password');
    });
  });

  describe('Password Management', () => {
    test('should change password with correct current password', async () => {
      const changeData = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };

      const mockUser = {
        id: userId,
        familyId,
        passwordHash: 'old-hashed-password',
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue('new-hashed-password' as never);
      mockPrisma.familyMember.update.mockResolvedValue(mockUser as any);
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 } as any);

      await UserService.changePassword(userId, changeData);

      expect(mockBcrypt.compare).toHaveBeenCalledWith('old-password', 'old-hashed-password');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('new-password', 12);
      expect(mockPrisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { passwordHash: 'new-hashed-password' },
      });
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { familyMemberId: userId },
      });
    });

    test('should reject password change with incorrect current password', async () => {
      const changeData = {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      };

      const mockUser = {
        id: userId,
        passwordHash: 'old-hashed-password',
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(UserService.changePassword(userId, changeData)).rejects.toThrow(
        'Current password is incorrect'
      );
    });

    test('should generate password reset token', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: userId,
        email,
        familyId,
        deletedAt: null,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);

      (UserService as any).passwordResetTokens = new Map();

      const token = await UserService.forgotPassword(email);

      expect(token).toBe('random-uuid-123');
      expect((UserService as any).passwordResetTokens.size).toBe(1);
    });

    test('should return token even for non-existent email (prevent enumeration)', async () => {
      const email = 'nonexistent@example.com';

      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      (UserService as any).passwordResetTokens = new Map();

      const token = await UserService.forgotPassword(email);

      expect(token).toBe('random-uuid-123'); // Always returns token
      expect((UserService as any).passwordResetTokens.size).toBe(0);
    });

    test('should reset password with valid token', async () => {
      const token = 'reset-token-123';
      const newPassword = 'new-password';

      const tokenData = {
        userId,
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        familyId,
        deletedAt: null,
      };

      (UserService as any).passwordResetTokens = new Map();
      (UserService as any).passwordResetTokens.set(token, tokenData);

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.hash.mockResolvedValue('new-hashed-password' as never);
      mockPrisma.familyMember.update.mockResolvedValue(mockUser as any);
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 } as any);

      await UserService.resetPassword(token, newPassword);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(mockPrisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { passwordHash: 'new-hashed-password' },
      });
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { familyMemberId: userId },
      });
      expect((UserService as any).passwordResetTokens.has(token)).toBe(false);
    });

    test('should reject expired reset token', async () => {
      const token = 'expired-token-123';
      const newPassword = 'new-password';

      const tokenData = {
        userId,
        email: 'test@example.com',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired
      };

      (UserService as any).passwordResetTokens = new Map();
      (UserService as any).passwordResetTokens.set(token, tokenData);

      await expect(UserService.resetPassword(token, newPassword)).rejects.toThrow(
        'Invalid or expired reset token'
      );

      expect((UserService as any).passwordResetTokens.has(token)).toBe(false);
    });
  });

  describe('Session Management', () => {
    test('should validate active session and extend expiry', async () => {
      const mockSession = {
        id: 'session-123',
        familyMemberId: userId,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        familyMember: {
          id: userId,
          email: 'test@example.com',
          deletedAt: null,
        },
      };

      mockPrisma.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.session.update.mockResolvedValue(mockSession as any);

      const result = await UserService.validateSession(sessionToken);

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { expiresAt: expect.any(Date) },
      });
    });

    test('should return null for expired session', async () => {
      const mockSession = {
        id: 'session-123',
        familyMemberId: userId,
        token: sessionToken,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired
        familyMember: null,
      };

      mockPrisma.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.session.delete.mockResolvedValue(mockSession as any);

      const result = await UserService.validateSession(sessionToken);

      expect(result).toBeNull();
      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });
    });

    test('should return null for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const result = await UserService.validateSession(sessionToken);

      expect(result).toBeNull();
    });

    test('should logout user and delete session', async () => {
      const mockSession = {
        id: 'session-123',
        familyMemberId: userId,
        familyMember: {
          familyId,
        },
      };

      mockPrisma.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.session.delete.mockResolvedValue(mockSession as any);

      await UserService.logout(sessionToken);

      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { token: sessionToken },
      });
    });

    test('should handle logout for non-existent session gracefully', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await UserService.logout('invalid-token');

      expect(mockPrisma.session.delete).not.toHaveBeenCalled();
    });

    test('should get user sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          familyMemberId: userId,
          token: 'token-1',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          createdAt: new Date(),
        },
        {
          id: 'session-2',
          familyMemberId: userId,
          token: 'token-2',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions as any);

      const sessions = await UserService.getUserSessions(userId);

      expect(sessions).toHaveLength(2);
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
        where: {
          familyMemberId: userId,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    test('should delete all user sessions', async () => {
      const mockUser = {
        id: userId,
        familyId,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 3 } as any);

      await UserService.deleteAllSessions(userId);

      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { familyMemberId: userId },
      });
    });

    test('should delete specific session', async () => {
      const sessionId = 'session-to-delete';
      const mockSession = {
        id: sessionId,
        familyMemberId: userId,
        familyMember: { familyId },
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockSession as any);
      mockPrisma.session.delete.mockResolvedValue(mockSession as any);

      await UserService.deleteSession(sessionId, userId);

      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { id: sessionId },
      });
    });

    test('should reject deletion of non-existent session', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      await expect(UserService.deleteSession('invalid-session', userId)).rejects.toThrow(
        'Session not found'
      );
    });
  });

  describe('Profile Management', () => {
    test('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com',
      };

      const mockUser = {
        id: userId,
        familyId,
        firstName: 'Original',
        lastName: 'Name',
        email: 'original@example.com',
      };

      const updatedUser = {
        ...mockUser,
        ...updateData,
        emailVerified: false, // Email changed
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.familyMember.update.mockResolvedValue(updatedUser as any);

      const result = await UserService.updateProfile(userId, updateData);

      expect(result.firstName).toBe('Updated');
      expect(result.email).toBe('updated@example.com');
      expect(mockPrisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          firstName: 'Updated',
          lastName: 'Name',
          email: 'updated@example.com',
          emailVerified: false,
        }),
      });
    });

    test('should get user with family details', async () => {
      const mockUserWithFamily = {
        id: userId,
        email: 'test@example.com',
        family: {
          id: familyId,
          name: 'Test Family',
        },
        deletedAt: null,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUserWithFamily as any);

      const result = await UserService.getUserWithFamily(userId);

      expect(result?.family).toBeDefined();
      expect(result?.family.name).toBe('Test Family');
    });
  });

  describe('Invitation Handling', () => {
    test('should accept invitation by ID', async () => {
      const invitationData = {
        invitationId: 'invitation-123',
        firstName: 'Jane',
        lastName: 'Doe',
        password: 'password123',
        invitationToken: 'token-123',
      };

      const mockInvitation = {
        id: 'invitation-123',
        email: 'invited@example.com',
        passwordHash: '', // Pending invitation
        familyId,
        deletedAt: null,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockInvitation as any);
      mockBcrypt.hash.mockResolvedValue('hashed_password' as never);
      mockPrisma.familyMember.update.mockResolvedValue({
        ...mockInvitation,
        passwordHash: 'hashed_password',
        firstName: 'Jane',
        lastName: 'Doe',
        emailVerified: true,
      } as any);

      const result = await UserService.acceptInvitationById(invitationData);

      expect(result?.familyId).toBe(familyId);
      expect(mockPrisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: 'invitation-123' },
        data: {
          passwordHash: 'hashed_password',
          firstName: 'Jane',
          lastName: 'Doe',
          emailVerified: true,
        },
      });
    });

    test('should reject invalid invitation ID', async () => {
      const invitationData = {
        invitationId: 'invalid-invitation',
        firstName: 'Jane',
        lastName: 'Doe',
        password: 'password123',
        invitationToken: 'token-123',
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      const result = await UserService.acceptInvitationById(invitationData);

      expect(result).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle MFA setup for user without secret', async () => {
      const mockUser = {
        id: userId,
        mfaSecret: null,
      };

      mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);

      await expect(UserService.enableMfa(userId, '123456')).rejects.toThrow('MFA not set up');
    });

    test('should handle session extension', async () => {
      const sessionId = 'session-123';

      mockPrisma.session.update.mockResolvedValue({} as any);

      await UserService.extendSession(sessionId);

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: {
          expiresAt: expect.any(Date),
        },
      });
    });

    test('should get session by ID', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        token: 'token-123',
        familyMemberId: userId,
      };

      mockPrisma.session.findUnique.mockResolvedValue(mockSession as any);

      const session = await UserService.getSessionById(sessionId);

      expect(session?.id).toBe(sessionId);
    });

    test('should handle token cleanup for expired tokens', async () => {
      const expiredToken = 'expired-token';

      (UserService as any).emailVerificationTokens = new Map();
      (UserService as any).emailVerificationTokens.set(expiredToken, {
        userId,
        email: 'test@example.com',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired
      });

      await expect(UserService.verifyEmail(userId, expiredToken)).rejects.toThrow(
        'Invalid verification token'
      );

      // Token should be cleaned up
      expect((UserService as any).emailVerificationTokens.has(expiredToken)).toBe(false);
    });

    test('should handle user not found scenarios gracefully', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(UserService.updateProfile(userId, { firstName: 'New' })).rejects.toThrow(
        'User not found'
      );

      await expect(UserService.changePassword(userId, {
        currentPassword: 'old',
        newPassword: 'new'
      })).rejects.toThrow('User not found');

      await expect(UserService.deleteAllSessions(userId)).rejects.toThrow('User not found');
    });
  });
});