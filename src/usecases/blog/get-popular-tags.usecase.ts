// src/usecases/blog/get-popular-tags.usecase.ts

import { Injectable } from '@nestjs/common';
import type { TagWithCount } from '@src/modules/blog/blog.types';
import { TagQueryService } from '@src/modules/blog/queries/tag.query.service';

@Injectable()
export class GetPopularTagsUsecase {
  constructor(private readonly tagQueryService: TagQueryService) {}

  async execute(limit: number = 10): Promise<TagWithCount[]> {
    return this.tagQueryService.getPopularTags(limit);
  }
}