// src/usecases/blog/approve-comment.usecase.ts

import { Injectable } from '@nestjs/common';
import type { CommentView } from '@src/modules/blog/blog.types';
import { CommentService } from '@src/modules/blog/base/services/comment.service';
import { CommentQueryService } from '@src/modules/blog/queries/comment.query.service';

@Injectable()
export class ApproveCommentUsecase {
  constructor(
    private readonly commentService: CommentService,
    private readonly commentQueryService: CommentQueryService,
  ) {}

  async execute(id: string): Promise<CommentView> {
    const snapshot = await this.commentService.approveComment(id);
    return this.commentQueryService.getCommentOrThrow(snapshot.id);
  }
}