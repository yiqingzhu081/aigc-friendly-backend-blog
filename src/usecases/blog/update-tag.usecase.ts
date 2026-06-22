// src/usecases/blog/update-tag.usecase.ts

import { Injectable } from '@nestjs/common';
import type { TagView, UpdateTagInput } from '@src/modules/blog/blog.types';
import { TagQueryService } from '@src/modules/blog/queries/tag.query.service';
import { TagService } from '@src/modules/blog/base/services/tag.service';

@Injectable()
export class UpdateTagUsecase {
  constructor(
    private readonly tagService: TagService,
    private readonly tagQueryService: TagQueryService,
  ) {}

  async execute(id: string, input: UpdateTagInput): Promise<TagView> {
    const saved = await this.tagService.updateTag(id, input);
    return this.tagQueryService.getTagOrThrow(saved.id);
  }
}