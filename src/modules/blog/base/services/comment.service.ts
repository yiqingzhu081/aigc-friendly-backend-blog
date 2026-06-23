// src/modules/blog/base/services/comment.service.ts

import { DomainError } from '@core/common/errors/domain-error';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { BLOG_ERROR } from '../../blog.errors';
import type { CommentSnapshot, CreateCommentInput, UpdateCommentInput } from '../../blog.types';
import { CommentEntity, CommentStatus } from '../entities/comment.entity';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
  ) {}

  async createComment(input: CreateCommentInput): Promise<CommentSnapshot> {
    let level = 1;

    if (input.parentId) {
      const parentComment = await this.commentRepository.findOne({ where: { id: input.parentId } });
      if (!parentComment) {
        throw new DomainError(BLOG_ERROR.COMMENT_NOT_FOUND, '父评论不存在');
      }

      if (parentComment.level >= 3) {
        throw new DomainError(BLOG_ERROR.COMMENT_NOT_FOUND, '评论嵌套层级不能超过3层');
      }

      level = parentComment.level + 1;
    }

    const authorAvatar = this.generateGravatarUrl(input.authorEmail);

    const comment = this.commentRepository.create({
      postId: input.postId,
      parentId: input.parentId || null,
      level,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      authorAvatar,
      content: input.content,
      status: CommentStatus.PENDING,
    });

    const saved = await this.commentRepository.save(comment);
    return this.toCommentSnapshot(saved);
  }

  async updateComment(id: string, input: UpdateCommentInput): Promise<CommentSnapshot> {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) {
      throw new DomainError(BLOG_ERROR.COMMENT_NOT_FOUND, '评论不存在');
    }

    if (input.content !== undefined) {
      comment.content = input.content;
    }

    if (input.status !== undefined) {
      comment.status = input.status as CommentStatus;
    }

    if (input.rejectReason !== undefined) {
      comment.rejectReason = input.rejectReason || null;
    }

    const saved = await this.commentRepository.save(comment);
    return this.toCommentSnapshot(saved);
  }

  async deleteComment(id: string): Promise<boolean> {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) {
      throw new DomainError(BLOG_ERROR.COMMENT_NOT_FOUND, '评论不存在');
    }

    await this.commentRepository.delete(id);
    return true;
  }

  private generateGravatarUrl(email: string): string {
    const hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?s=80&d=identicon`;
  }

  private toCommentSnapshot(comment: CommentEntity): CommentSnapshot {
    return {
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      level: comment.level,
      authorName: comment.authorName,
      authorEmail: comment.authorEmail,
      authorAvatar: comment.authorAvatar,
      content: comment.content,
      status: comment.status,
      rejectReason: comment.rejectReason,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}