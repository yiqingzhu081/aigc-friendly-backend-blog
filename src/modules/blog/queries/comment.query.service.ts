// src/modules/blog/queries/comment.query.service.ts

import { DomainError } from '@core/common/errors/domain-error';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BLOG_ERROR } from '../blog.errors';
import type { CommentTreeNode, CommentView, PaginatedCommentsResult } from '../blog.types';
import { CommentEntity, CommentStatus } from '../base/entities/comment.entity';

@Injectable()
export class CommentQueryService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
  ) {}

  async getCommentsByPostId(postId: string): Promise<CommentTreeNode[]> {
    const allComments = await this.commentRepository.find({
      where: { postId, status: CommentStatus.APPROVED },
      order: { createdAt: 'ASC' },
    });

    return this.buildCommentTree(allComments);
  }

  async getCommentById(id: string): Promise<CommentView | null> {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) {
      return null;
    }
    return this.toCommentView(comment);
  }

  async getCommentOrThrow(id: string): Promise<CommentView> {
    const comment = await this.getCommentById(id);
    if (!comment) {
      throw new DomainError(BLOG_ERROR.COMMENT_NOT_FOUND, '评论不存在');
    }
    return comment;
  }

  async getPendingComments(
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PaginatedCommentsResult> {
    const skip = (page - 1) * pageSize;

    const [comments, total] = await this.commentRepository.findAndCount({
      where: { status: CommentStatus.PENDING },
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      items: comments.map((comment) => this.toCommentView(comment)),
      total,
      page,
      pageSize,
    };
  }

  private buildCommentTree(comments: CommentEntity[]): CommentTreeNode[] {
    const commentMap = new Map<string, CommentTreeNode>();
    const rootComments: CommentTreeNode[] = [];

    for (const comment of comments) {
      const node: CommentTreeNode = {
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
        children: [],
      };

      commentMap.set(comment.id, node);

      if (!comment.parentId) {
        rootComments.push(node);
      } else {
        const parentNode = commentMap.get(comment.parentId);
        if (parentNode) {
          parentNode.children.push(node);
        }
      }
    }

    return rootComments;
  }

  private toCommentView(comment: CommentEntity): CommentView {
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
