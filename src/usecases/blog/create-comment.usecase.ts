// src/usecases/blog/create-comment.usecase.ts

import { Injectable } from '@nestjs/common';
import type { CommentView } from '@src/modules/blog/blog.types';
import { CommentService } from '@src/modules/blog/base/services/comment.service';
import { CommentQueryService } from '@src/modules/blog/queries/comment.query.service';

@Injectable()
export class CreateCommentUsecase {
  constructor(
    private readonly commentService: CommentService,
    private readonly commentQueryService: CommentQueryService,
  ) {}

  async execute(input: {
    postId: string;
    parentId?: string | null;
    authorName: string;
    authorEmail: string;
    content: string;
  }): Promise<CommentView> {
    const snapshot = await this.commentService.createComment(input);
    return this.commentQueryService.getCommentOrThrow(snapshot.id);
  }
}