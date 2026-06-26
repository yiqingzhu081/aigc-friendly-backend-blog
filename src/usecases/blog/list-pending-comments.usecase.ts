// src/usecases/blog/list-pending-comments.usecase.ts

import { Injectable } from '@nestjs/common';
import type { PaginatedCommentsResult } from '@src/modules/blog/blog.types';
import { CommentQueryService } from '@src/modules/blog/queries/comment.query.service';

@Injectable()
export class ListPendingCommentsUsecase {
  constructor(private readonly commentQueryService: CommentQueryService) {}

  async execute(page: number = 1, pageSize: number = 20): Promise<PaginatedCommentsResult> {
    return this.commentQueryService.getPendingComments(page, pageSize);
  }
}