// src/usecases/blog/list-comments.usecase.ts

import { Injectable } from '@nestjs/common';
import type { CommentTreeNode } from '@src/modules/blog/blog.types';
import { CommentQueryService } from '@src/modules/blog/queries/comment.query.service';

@Injectable()
export class ListCommentsUsecase {
  constructor(private readonly commentQueryService: CommentQueryService) {}

  async execute(postId: string): Promise<CommentTreeNode[]> {
    return this.commentQueryService.getCommentsByPostId(postId);
  }
}