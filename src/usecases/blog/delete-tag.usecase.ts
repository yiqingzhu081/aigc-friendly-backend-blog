// src/usecases/blog/delete-tag.usecase.ts

import { Injectable } from '@nestjs/common';
import { TagService } from '@src/modules/blog/base/services/tag.service';

@Injectable()
export class DeleteTagUsecase {
  constructor(private readonly tagService: TagService) {}

  async execute(id: string): Promise<boolean> {
    return this.tagService.deleteTag(id);
  }
}