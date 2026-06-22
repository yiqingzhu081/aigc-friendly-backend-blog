// src/usecases/blog/list-tags.usecase.ts

import { Injectable } from '@nestjs/common';
import type { TagView } from '@src/modules/blog/blog.types';
import { TagQueryService } from '@src/modules/blog/queries/tag.query.service';

@Injectable()
export class ListTagsUsecase {
  constructor(private readonly tagQueryService: TagQueryService) {}

  async execute(): Promise<TagView[]> {
    return this.tagQueryService.getAllTags();
  }
}