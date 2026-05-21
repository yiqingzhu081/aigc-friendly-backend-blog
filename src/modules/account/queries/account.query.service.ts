// src/modules/account/queries/account.query.service.ts
import type { PersistenceTransactionContext } from '@app-types/common/transaction.types';
import { IdentityTypeEnum, UserAccountView } from '@app-types/models/account.types';
import { UserInfoView } from '@app-types/models/auth.types';
import { Gender, UserState } from '@app-types/models/user-info.types';
import { UsecaseSession } from '@app-types/auth/session.types';
import { hasRole } from '@core/account/policy/role-access.policy';
import { canViewUserInfo } from '@core/account/policy/user-info-visibility.policy';
import { ACCOUNT_ERROR } from '@core/common/errors';
import { DomainError, PERMISSION_ERROR } from '@core/common/errors/domain-error';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getTypeOrmEntityManager } from '@src/infrastructure/database/transaction/typeorm-persistence-transaction-context';
import { Repository } from 'typeorm';
import type { AccountLoginBootstrapSnapshot, AccountSnapshot } from '../account.types';
import { AccountEntity } from '../base/entities/account.entity';
import { UserInfoEntity } from '../base/entities/user-info.entity';

export type VisibleDetailMode = 'BASIC' | 'FULL';

@Injectable()
export class AccountQueryService {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(UserInfoEntity)
    private readonly userInfoRepository: Repository<UserInfoEntity>,
  ) {}

  async getAccountById(params: {
    session: UsecaseSession;
    targetAccountId: number;
  }): Promise<UserAccountView> {
    const { session, targetAccountId } = params;

    if (!Number.isInteger(targetAccountId) || targetAccountId <= 0) {
      throw new DomainError(PERMISSION_ERROR.ACCESS_DENIED, '非法的目标账户 ID');
    }

    const allowed = this.isAllowedToViewAccountDetail(session, targetAccountId);
    if (!allowed) {
      throw new DomainError(PERMISSION_ERROR.ACCESS_DENIED, '无权限查看该账户信息');
    }

    const account = await this.accountRepository.findOne({ where: { id: targetAccountId } });
    if (!account) {
      throw new DomainError(ACCOUNT_ERROR.ACCOUNT_NOT_FOUND, '账户不存在');
    }

    return this.toUserAccountView(account);
  }

  async findAccountSnapshotById(params: {
    accountId: number;
    transactionContext?: PersistenceTransactionContext;
  }): Promise<AccountSnapshot | null> {
    const accountRepository = this.getAccountRepository(params.transactionContext);
    const account = await accountRepository.findOne({ where: { id: params.accountId } });
    return account ? this.toUserAccountView(account) : null;
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

  async getVisibleUserInfo(params: {
    session: UsecaseSession;
    targetAccountId: number;
    detail?: VisibleDetailMode;
  }): Promise<UserInfoView> {
    const { session, targetAccountId } = params;
    const detail: VisibleDetailMode = params.detail ?? 'FULL';

    if (!Number.isInteger(targetAccountId) || targetAccountId <= 0) {
      throw new DomainError(PERMISSION_ERROR.ACCESS_DENIED, '非法的目标账户 ID');
    }

    const allowed = this.isAllowedToView(session, targetAccountId);
    if (!allowed) {
      throw new DomainError(PERMISSION_ERROR.ACCESS_DENIED, '无权限查看该用户信息');
    }

    const view = await this.getUserInfoViewStrict({ accountId: targetAccountId });

    if (detail === 'BASIC') {
      return this.maskToBasic(view);
    }
    return view;
  }

  async getLoginBootstrapSnapshot(params: {
    accountId: number;
    transactionContext?: PersistenceTransactionContext;
  }): Promise<AccountLoginBootstrapSnapshot> {
    const accountRepository = this.getAccountRepository(params.transactionContext);
    const account = await accountRepository.findOne({ where: { id: params.accountId } });
    if (!account) {
      throw new DomainError(ACCOUNT_ERROR.ACCOUNT_NOT_FOUND, '账户不存在');
    }

    const userInfo = await this.findUserInfoByAccountId(
      params.accountId,
      params.transactionContext,
    );
    if (!userInfo) {
      throw new DomainError(ACCOUNT_ERROR.USER_INFO_NOT_FOUND, '用户信息不存在');
    }

    return {
      account: {
        id: account.id,
        loginName: account.loginName,
        loginEmail: account.loginEmail,
        status: account.status,
        identityHint: account.identityHint,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
      userInfo: {
        id: userInfo.id,
        accountId: userInfo.accountId,
        nickname: userInfo.nickname,
        avatarUrl: userInfo.avatarUrl,
        accessGroup: userInfo.accessGroup ?? null,
        metaDigest: userInfo.metaDigest ?? null,
        createdAt: userInfo.createdAt,
        updatedAt: userInfo.updatedAt,
      },
    };
  }

  async getUserInfoViewStrict(params: {
    accountId: number;
    transactionContext?: PersistenceTransactionContext;
  }): Promise<
    UserInfoView & {
      nickname: string;
      userState: UserState;
      notifyCount: number;
      unreadCount: number;
      createdAt: Date;
      updatedAt: Date;
    }
  > {
    const { accountId } = params;

    const base = await this.findUserInfoByAccountId(accountId, params.transactionContext);
    if (!base) {
      throw new DomainError(
        ACCOUNT_ERROR.USER_INFO_NOT_FOUND,
        `账户 ID ${accountId} 对应的用户信息不存在，无法完成操作`,
      );
    }

    const finalAccessGroup: IdentityTypeEnum[] = base.accessGroup?.length
      ? base.accessGroup
      : [IdentityTypeEnum.REGISTRANT];

    return this.buildUserInfoView(base, accountId, finalAccessGroup) as UserInfoView & {
      nickname: string;
      userState: UserState;
      notifyCount: number;
      unreadCount: number;
      createdAt: Date;
      updatedAt: Date;
    };
  }

  async getUserInfoViewForLogin(params: { accountId: number }): Promise<UserInfoView> {
    const base = await this.findUserInfoByAccountId(params.accountId);
    const finalAccessGroup: IdentityTypeEnum[] = base?.accessGroup?.length
      ? base.accessGroup
      : [IdentityTypeEnum.REGISTRANT];

    return this.buildUserInfoView(base, params.accountId, finalAccessGroup);
  }

  private isAllowedToView(session: UsecaseSession, targetAccountId: number): boolean {
    const isSelf = session.accountId === targetAccountId;
    if (isSelf) return true;
    if (hasRole(session.roles, IdentityTypeEnum.ADMIN)) return true;

    return canViewUserInfo(session.roles, { isSelf });
  }

  private isAllowedToViewAccountDetail(session: UsecaseSession, targetAccountId: number): boolean {
    const isSelf = session.accountId === targetAccountId;
    if (isSelf) return true;
    if (hasRole(session.roles, IdentityTypeEnum.ADMIN)) return true;
    return false;
  }

  private buildUserInfoView(
    base: UserInfoEntity | null,
    accountId: number,
    accessGroup: IdentityTypeEnum[],
  ): UserInfoView {
    return {
      accountId,
      accessGroup,
      ...this.buildBasicFields(base),
      ...this.buildContactFields(base),
      ...this.buildExtendedFields(base),
      ...this.buildSystemFields(base),
    };
  }

  private buildBasicFields(base: UserInfoEntity | null) {
    return {
      nickname: base?.nickname ?? '',
      gender: base?.gender ?? Gender.SECRET,
      birthDate: base?.birthDate ?? null,
      avatarUrl: base?.avatarUrl ?? null,
      signature: base?.signature ?? null,
    };
  }

  private buildContactFields(base: UserInfoEntity | null) {
    return {
      email: base?.email ?? null,
      address: base?.address ?? null,
      phone: base?.phone ?? null,
    };
  }

  private buildExtendedFields(base: UserInfoEntity | null) {
    return {
      tags: this.normalizeTags(base?.tags),
      geographic: base?.geographic ?? null,
      metaDigest: base?.metaDigest ?? null,
    };
  }

  private buildSystemFields(base: UserInfoEntity | null) {
    return {
      notifyCount: base?.notifyCount ?? 0,
      unreadCount: base?.unreadCount ?? 0,
      userState: base?.userState ?? UserState.PENDING,
      createdAt: base?.createdAt ?? new Date(),
      updatedAt: base?.updatedAt ?? new Date(),
    };
  }

  private async findUserInfoByAccountId(
    accountId: number,
    transactionContext?: PersistenceTransactionContext,
  ): Promise<UserInfoEntity | null> {
    const repository = this.getUserInfoRepository(transactionContext);
    return await repository.findOne({
      where: { accountId },
      relations: ['account'],
    });
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

  private normalizeTags(tags: unknown): string[] | null {
    if (!tags) return null;
    if (Array.isArray(tags)) return tags.map((v) => String(v));
    return null;
  }

  private maskToBasic(view: UserInfoView): UserInfoView {
    return {
      accountId: view.accountId,
      nickname: view.nickname,
      gender: view.gender,
      birthDate: view.birthDate,
      avatarUrl: view.avatarUrl,
      email: null,
      signature: null,
      accessGroup: view.accessGroup,
      address: null,
      phone: view.phone,
      tags: null,
      geographic: null,
      metaDigest: null,
      notifyCount: 0,
      unreadCount: 0,
      userState: view.userState,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt,
    };
  }
}
