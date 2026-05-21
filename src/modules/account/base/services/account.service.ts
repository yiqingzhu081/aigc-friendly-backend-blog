// src/modules/account/base/services/account.service.ts

import type { PersistenceTransactionContext } from '@app-types/common/transaction.types';
import {
  AccountStatus,
  AccountWithAccessGroup,
  AudienceTypeEnum,
  IdentityTypeEnum,
  LoginHistoryItemModel,
  ThirdPartyProviderEnum,
  UserAccountView,
} from '@app-types/models/account.types';
import { Gender, type GeographicInfo, UserState } from '@app-types/models/user-info.types';
import { ACCOUNT_ERROR, AUTH_ERROR, DomainError } from '@core/common/errors/domain-error';
import { normalizeEmail } from '@core/common/normalize/normalize.helper';
import { LegacyPasswordCryptoHelper } from '@modules/common/password/legacy-password-crypto.helper';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getTypeOrmEntityManager } from '@src/infrastructure/database/transaction/typeorm-persistence-transaction-context';
import { Repository } from 'typeorm';

// ✅ base 层实体（始终存在）
import { AccountEntity } from '../entities/account.entity';
import { UserInfoEntity } from '../entities/user-info.entity';

import { AccountSecurityService } from './account-security.service';

export interface AccountCreateData {
  loginName?: string | null;
  loginEmail?: string | null;
  loginPassword?: string;
  status?: AccountStatus;
  audience?: AudienceTypeEnum;
  identityHint?: string | null;
  recentLoginHistory?: LoginHistoryItemModel[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserInfoCreateData {
  accountId?: number;
  nickname?: string;
  gender?: Gender;
  birthDate?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  signature?: string | null;
  accessGroup?: IdentityTypeEnum[];
  address?: string | null;
  phone?: string | null;
  tags?: string[] | null;
  geographic?: GeographicInfo | null;
  metaDigest?: IdentityTypeEnum[] | null;
  notifyCount?: number;
  unreadCount?: number;
  userState?: UserState;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class AccountService {
  constructor(
    // private readonly passwordHelper: PasswordPbkdf2Helper, // 移除这行
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(UserInfoEntity)
    private readonly userInfoRepository: Repository<UserInfoEntity>,
    private readonly accountSecurityService: AccountSecurityService,
  ) {}

  // =========================================================
  // 登录历史 & 账户/用户信息（原样保留）
  // =========================================================

  /** 记录用户登录历史：保留最近 5 条（新记录 + 旧 4 条） */
  async recordLoginHistory(
    accountId: number,
    timestamp: string,
    ip?: string,
    audience?: string,
  ): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
      select: ['recentLoginHistory'],
    });

    const newHistoryItem: LoginHistoryItemModel = { ip: ip || '', timestamp, audience };
    const existingHistory = account?.recentLoginHistory || [];
    const updatedHistory: LoginHistoryItemModel[] = [
      newHistoryItem,
      ...existingHistory.slice(0, 4),
    ];

    await this.accountRepository.update(accountId, {
      recentLoginHistory: updatedHistory,
      updatedAt: new Date(),
    });
  }

  /** 根据 ID 查询账户 */
  async findOneById(
    id: number,
    transactionContext?: PersistenceTransactionContext,
  ): Promise<AccountEntity | null> {
    const repository = this.getAccountRepository(transactionContext);
    return await repository.findOne({ where: { id } });
  }

  /** 根据登录名或邮箱查询账户 */
  async findByLoginName(loginName: string): Promise<AccountEntity | null> {
    const normalizedLoginName = normalizeEmail(loginName);
    return await this.accountRepository
      .createQueryBuilder('account')
      .where('account.loginName = :loginName', { loginName })
      .orWhere('account.loginEmail = :loginEmail', { loginEmail: normalizedLoginName })
      .getOne();
  }

  /** 根据邮箱查找账户 */
  async findByEmail(loginEmail: string): Promise<AccountEntity | null> {
    const normalizedEmail = normalizeEmail(loginEmail);
    return await this.accountRepository.findOne({ where: { loginEmail: normalizedEmail } });
  }

  /** 精确匹配登录名 */
  async findByName(loginName: string): Promise<AccountEntity | null> {
    return await this.accountRepository.findOne({ where: { loginName } });
  }

  /** 根据账户 ID 查找用户信息（带 account 关系） */
  async findUserInfoByAccountId(
    accountId: number,
    transactionContext?: PersistenceTransactionContext,
  ): Promise<UserInfoEntity | null> {
    const repository = this.getUserInfoRepository(transactionContext);
    return await repository.findOne({
      where: { accountId },
      relations: ['account'],
    });
  }

  /** 根据昵称查找用户信息 */
  async findUserInfoByNickname(nickname: string): Promise<UserInfoEntity | null> {
    return await this.userInfoRepository.findOne({ where: { nickname } });
  }

  /** 创建账户实体（不落库） */
  createAccountEntity(params: {
    accountData: AccountCreateData;
    transactionContext?: PersistenceTransactionContext;
  }): AccountEntity {
    const { accountData, transactionContext } = params;
    const repository = this.getAccountRepository(transactionContext);
    return repository.create(accountData);
  }

  /** 落库账户实体 */
  async saveAccount(params: {
    account: AccountEntity;
    transactionContext?: PersistenceTransactionContext;
  }): Promise<AccountEntity> {
    const { account, transactionContext } = params;
    const repository = this.getAccountRepository(transactionContext);
    return await repository.save(account);
  }

  /** 更新账户 */
  async updateAccount(
    id: number,
    updateData: Partial<AccountEntity>,
    transactionContext?: PersistenceTransactionContext,
  ): Promise<void> {
    const repository = this.getAccountRepository(transactionContext);
    await repository.update(id, updateData);
  }

  /**
   * 显式锁定账户以避免并发覆盖
   * @param accountId 账户 ID
   * @param transactionContext 事务上下文
   * @returns 锁定的账户实体
   */
  async lockByIdForUpdate(
    accountId: number,
    transactionContext: PersistenceTransactionContext,
  ): Promise<AccountEntity> {
    const repository = this.getAccountRepository(transactionContext);
    const account = await repository
      .createQueryBuilder('account')
      .where('account.id = :accountId', { accountId })
      .setLock('pessimistic_write')
      .getOne();

    if (!account) {
      throw new DomainError(ACCOUNT_ERROR.ACCOUNT_NOT_FOUND, '账户不存在');
    }

    return account;
  }

  /** 创建用户信息实体（不落库） */
  createUserInfoEntity(params: {
    userInfoData: UserInfoCreateData;
    transactionContext?: PersistenceTransactionContext;
  }): UserInfoEntity {
    const { userInfoData, transactionContext } = params;
    const repository = this.getUserInfoRepository(transactionContext);
    return repository.create(userInfoData);
  }

  /** 落库用户信息实体 */
  async saveUserInfo(params: {
    userInfo: UserInfoEntity;
    transactionContext?: PersistenceTransactionContext;
  }): Promise<UserInfoEntity> {
    const { userInfo, transactionContext } = params;
    const repository = this.getUserInfoRepository(transactionContext);
    return await repository.save(userInfo);
  }

  /**
   * 更新用户 accessGroup 并同步 metaDigest
   */
  async updateUserInfoAccessGroup(params: {
    accountId: number;
    accessGroup: IdentityTypeEnum[];
    transactionContext: PersistenceTransactionContext;
  }): Promise<{ isUpdated: boolean }> {
    const { accountId, accessGroup, transactionContext } = params;
    const repository = this.getUserInfoRepository(transactionContext);
    const userInfo = await repository.findOne({ where: { accountId } });
    if (!userInfo) {
      throw new DomainError(ACCOUNT_ERROR.USER_INFO_NOT_FOUND, '用户信息不存在');
    }

    const current = userInfo.accessGroup ?? [];
    const isSame =
      current.length === accessGroup.length && current.every((v, i) => v === accessGroup[i]);
    if (isSame) {
      return { isUpdated: false };
    }

    userInfo.accessGroup = accessGroup;
    userInfo.metaDigest = accessGroup;
    userInfo.updatedAt = new Date();
    await repository.save(userInfo);
    return { isUpdated: true };
  }

  // =========================================================
  // 密码工具（原样保留）
  // =========================================================

  /** 使用创建时间作为盐值进行 PBKDF2 加密 */
  static hashPasswordWithTimestamp(password: string, createdAt: Date): string {
    // 应用与 PasswordPolicyService 相同的预处理
    const processedPassword = AccountService.preprocessPassword(password);
    const salt = createdAt.toString();
    return LegacyPasswordCryptoHelper.hashPasswordWithCrypto(processedPassword, salt);
  }

  /** 验证密码 */
  static verifyPassword(password: string, hashedPassword: string, createdAt: Date): boolean {
    // 应用与 PasswordPolicyService 相同的预处理
    const processedPassword = AccountService.preprocessPassword(password);
    const salt = createdAt.toString();
    return LegacyPasswordCryptoHelper.verifyPasswordWithCrypto(
      processedPassword,
      salt,
      hashedPassword,
    );
  }

  /**
   * 密码预处理 - 与 PasswordPolicyService 保持一致
   * @param password 原始密码
   * @returns 预处理后的密码
   */
  private static preprocessPassword(password: string): string {
    if (!password || /^\s*$/u.test(password)) {
      throw new DomainError(AUTH_ERROR.INVALID_PASSWORD, '密码不能为空或纯空白字符');
    }

    const normalizedPassword = password.normalize('NFKC');

    if (/^\s|\s$/u.test(normalizedPassword)) {
      throw new DomainError(AUTH_ERROR.INVALID_PASSWORD, '密码首尾不能包含空格');
    }

    return normalizedPassword;
  }

  private getAccountRepository(
    transactionContext?: PersistenceTransactionContext,
  ): Repository<AccountEntity> {
    return transactionContext
      ? getTypeOrmEntityManager(transactionContext).getRepository(AccountEntity)
      : this.accountRepository;
  }

  private getUserInfoRepository(
    transactionContext?: PersistenceTransactionContext,
  ): Repository<UserInfoEntity> {
    return transactionContext
      ? getTypeOrmEntityManager(transactionContext).getRepository(UserInfoEntity)
      : this.userInfoRepository;
  }

  // =========================================================
  // 唯一性检查（原样保留）
  // =========================================================

  /** 检查账户是否存在（邮箱必传，登录名可选） */
  async checkAccountExists({
    loginName,
    loginEmail,
  }: {
    loginName?: string | null;
    loginEmail: string;
  }): Promise<boolean> {
    const accountByEmail = await this.findByEmail(loginEmail);
    if (accountByEmail) return true;

    if (loginName) {
      const accountByName = await this.findByName(loginName);
      if (accountByName) return true;
    }
    return false;
  }

  /** 检查昵称是否存在 */
  async checkNicknameExists(nickname: string): Promise<boolean> {
    const userInfo = await this.findUserInfoByNickname(nickname);
    return !!userInfo;
  }

  // =========================================================
  // DTO 映射（原样保留）
  // =========================================================

  /** 根据 ID 获取账户详细信息（DTO） */
  async getAccountById(accountId: number): Promise<UserAccountView> {
    const account = await this.findOneById(accountId);
    if (!account) {
      throw new DomainError(ACCOUNT_ERROR.ACCOUNT_NOT_FOUND, '账户不存在');
    }

    return this.toUserAccountView(account);
  }

  toUserAccountView(account: AccountEntity): UserAccountView {
    return {
      id: account.id,
      loginName: account.loginName,
      loginEmail: account.loginEmail,
      status: account.status,
      identityHint: account.identityHint,
      recentLoginHistory: account.recentLoginHistory || null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /** 获取用户 + accessGroup */
  async getUserWithAccessGroup(accountId: number): Promise<AccountWithAccessGroup> {
    const account = await this.findOneById(accountId);
    if (!account) {
      throw new DomainError(ACCOUNT_ERROR.ACCOUNT_NOT_FOUND, '账户不存在');
    }

    const userInfo = await this.findUserInfoByAccountId(accountId);
    if (!userInfo) {
      throw new DomainError(ACCOUNT_ERROR.USER_INFO_NOT_FOUND, '用户信息不存在');
    }

    // 检查账户安全性
    const securityResult = this.accountSecurityService.checkAndHandleAccountSecurity({
      ...account,
      userInfo,
    });

    // 如果账号被暂停，抛出错误
    if (securityResult.wasSuspended) {
      throw new DomainError(ACCOUNT_ERROR.ACCOUNT_SUSPENDED, '账户因安全问题已被暂停');
    }

    // 返回数据库中的 accessGroup（已通过安全校验阻断不一致场景）
    const accessGroup: IdentityTypeEnum[] =
      userInfo.accessGroup && userInfo.accessGroup.length > 0
        ? userInfo.accessGroup
        : [IdentityTypeEnum.REGISTRANT];

    return {
      id: account.id,
      loginName: account.loginName || '',
      loginEmail: account.loginEmail || '',
      accessGroup,
    };
  }

  // =========================================================
  // 昵称挑选（原样保留）
  // =========================================================

  /**
   * 选择可用昵称：
   * 1) 尝试用户提供
   * 2) 尝试备选（loginName / loginEmail 前缀）
   * 3) 冲突则附加随机后缀
   * 4) 第三方注册有保底前缀（微信用户/Google用户等）
   */
  async pickAvailableNickname({
    providedNickname,
    fallbackOptions = [],
    provider,
  }: {
    providedNickname?: string;
    fallbackOptions?: ReadonlyArray<string>;
    provider?: ThirdPartyProviderEnum;
  }): Promise<string | undefined> {
    const candidates: string[] = [];
    if (providedNickname) candidates.push(providedNickname);

    for (const option of fallbackOptions) {
      const nickname = option.includes('@') ? option.split('@')[0] : option;
      if (nickname) candidates.push(nickname);
    }

    for (const candidate of candidates) {
      const exists = await this.checkNicknameExists(candidate);
      if (!exists) return candidate;

      const uniqueNickname = await this.generateUniqueNicknameWithSuffix(candidate);
      if (uniqueNickname) return uniqueNickname;
    }

    if (!provider) return undefined;

    const fallbackBase = this.getFallbackNicknameByProvider(provider);
    const fallbackNickname = await this.generateUniqueNicknameWithSuffix(fallbackBase);
    if (fallbackNickname) return fallbackNickname;

    const randomSuffix = this.generateRandomString(12);
    return `${fallbackBase}#${randomSuffix}`;
  }

  /** 第三方平台默认昵称前缀 */
  private getFallbackNicknameByProvider(provider: ThirdPartyProviderEnum): string {
    switch (provider) {
      case ThirdPartyProviderEnum.WEAPP:
      case ThirdPartyProviderEnum.WECHAT:
        return '微信用户';
      case ThirdPartyProviderEnum.QQ:
        return 'QQ用户';
      case ThirdPartyProviderEnum.GOOGLE:
        return 'Google用户';
      case ThirdPartyProviderEnum.GITHUB:
        return 'GitHub用户';
      default:
        return '用户';
    }
  }

  /** 在基础昵称上添加随机后缀，最多尝试 5 次 */
  private async generateUniqueNicknameWithSuffix(
    baseNickname: string,
  ): Promise<string | undefined> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const randomSuffix = this.generateRandomString(6);
      const uniqueNickname = `${baseNickname}#${randomSuffix}`;
      const exists = await this.checkNicknameExists(uniqueNickname);
      if (!exists) return uniqueNickname;
    }
    return undefined;
  }

  /** 生成指定长度的随机字符串（a-z0-9） */
  private generateRandomString(length: number): string {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }
}
