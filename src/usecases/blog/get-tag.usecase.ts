// src/usecases/blog/get-tag.usecase.ts

import { Injectable } from '@nestjs/common';
import type { TagView } from '@src/modules/blog/blog.types';
import { TagQueryService } from '@src/modules/blog/queries/tag.query.service';

@Injectable()
export class GetTagUsecase {
  constructor(private readonly tagQueryService: TagQueryService) {}

  async execute(id: string): Promise<TagView | null> {
    return this.tagQueryService.getTagById(id);
  }
}