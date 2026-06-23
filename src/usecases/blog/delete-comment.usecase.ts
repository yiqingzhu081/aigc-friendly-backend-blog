// src/usecases/blog/delete-comment.usecase.ts

import { Injectable } from '@nestjs/common';
import { CommentService } from '@src/modules/blog/base/services/comment.service';

@Injectable()
export class DeleteCommentUsecase {
  constructor(private readonly commentService: CommentService) {}

  async execute(id: string): Promise<boolean> {
    return this.commentService.deleteComment(id);
  }
}