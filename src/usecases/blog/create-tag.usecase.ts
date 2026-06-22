// src/usecases/blog/create-tag.usecase.ts

import { Injectable } from '@nestjs/common';
import type { CreateTagInput, TagView } from '@src/modules/blog/blog.types';
import { TagQueryService } from '@src/modules/blog/queries/tag.query.service';
import { TagService } from '@src/modules/blog/base/services/tag.service';

@Injectable()
export class CreateTagUsecase {
  constructor(
    private readonly tagService: TagService,
    private readonly tagQueryService: TagQueryService,
  ) {}

  async execute(input: CreateTagInput): Promise<TagView> {
    const saved = await this.tagService.createTag(input);
    return this.tagQueryService.getTagOrThrow(saved.id);
  }
}