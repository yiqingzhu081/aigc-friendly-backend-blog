// src/usecases/blog/reply-to-comment.usecase.ts

import { DomainError } from '@core/common/errors/domain-error';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BLOG_ERROR } from '@src/modules/blog/blog.errors';
import type { CommentView } from '@src/modules/blog/blog.types';
import { CommentService } from '@src/modules/blog/base/services/comment.service';
import { CommentQueryService } from '@src/modules/blog/queries/comment.query.service';
import { CommentEntity } from '@src/modules/blog/base/entities/comment.entity';

@Injectable()
export class ReplyToCommentUsecase {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    private readonly commentService: CommentService,
    private readonly commentQueryService: CommentQueryService,
  ) {}

  async execute(
    parentId: string,
    input: { authorName: string; authorEmail: string; content: string },
  ): Promise<CommentView> {
    const parentComment = await this.commentRepository.findOne({ where: { id: parentId } });
    if (!parentComment) {
      throw new DomainError(BLOG_ERROR.COMMENT_NOT_FOUND, '父评论不存在');
    }

    const snapshot = await this.commentService.createComment({
      postId: parentComment.postId,
      parentId,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      content: input.content,
    });

    return this.commentQueryService.getCommentOrThrow(snapshot.id);
  }
}
