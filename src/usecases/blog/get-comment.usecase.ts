// src/usecases/blog/get-comment.usecase.ts

import { Injectable } from '@nestjs/common';
import type { CommentView } from '@src/modules/blog/blog.types';
import { CommentQueryService } from '@src/modules/blog/queries/comment.query.service';

@Injectable()
export class GetCommentUsecase {
  constructor(private readonly commentQueryService: CommentQueryService) {}

  async execute(id: string): Promise<CommentView> {
    return this.commentQueryService.getCommentOrThrow(id);
  }
}