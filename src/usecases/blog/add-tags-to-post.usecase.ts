// src/usecases/blog/add-tags-to-post.usecase.ts

import { DomainError } from '@core/common/errors/domain-error';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BLOG_ERROR } from '@src/modules/blog/blog.errors';
import type { PostView } from '@src/modules/blog/blog.types';
import { BlogQueryService } from '@src/modules/blog/queries/blog.query.service';
import { PostEntity } from '@src/modules/blog/base/entities/post.entity';
import { TagEntity } from '@src/modules/blog/base/entities/tag.entity';

@Injectable()
export class AddTagsToPostUsecase {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    @InjectRepository(TagEntity)
    private readonly tagRepository: Repository<TagEntity>,
    private readonly blogQueryService: BlogQueryService,
  ) {}

  async execute(postId: string, tagIds: string[]): Promise<PostView> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new DomainError(BLOG_ERROR.POST_NOT_FOUND, '文章不存在');
    }

    const tags = await this.tagRepository.find({ where: { id: tagIds as unknown as string } });
    const foundTagIds = new Set(tags.map((t: TagEntity) => t.id));

    for (const tagId of tagIds) {
      if (!foundTagIds.has(tagId)) {
        throw new DomainError(BLOG_ERROR.TAG_NOT_FOUND, `标签 ${tagId} 不存在`);
      }
    }

    if (!post.tags) {
      post.tags = [];
    }

    const existingTagIds = new Set(post.tags.map((t: TagEntity) => t.id));
    for (const tag of tags) {
      if (!existingTagIds.has(tag.id)) {
        post.tags.push(tag);
      }
    }

    await this.postRepository.save(post);

    return this.blogQueryService.getPostOrThrow({ id: postId });
  }
}
