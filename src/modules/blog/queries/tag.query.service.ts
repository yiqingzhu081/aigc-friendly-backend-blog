// src/modules/blog/queries/tag.query.service.ts

import { DomainError } from '@core/common/errors/domain-error';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BLOG_ERROR } from '../blog.errors';
import type { TagView, TagWithCount } from '../blog.types';
import { TagEntity } from '../base/entities/tag.entity';
import { PostEntity } from '../base/entities/post.entity';

@Injectable()
export class TagQueryService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly tagRepository: Repository<TagEntity>,
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
  ) {}

  async getAllTags(): Promise<TagView[]> {
    const tags = await this.tagRepository.find({
      order: { createdAt: 'DESC' },
    });

    const postCountMap = await this.getPostCountMap();

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: postCountMap.get(tag.id) || 0,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }));
  }

  async getTagById(id: string): Promise<TagView | null> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      return null;
    }

    const postCountMap = await this.getPostCountMap();

    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: postCountMap.get(tag.id) || 0,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }

  async getTagOrThrow(id: string): Promise<TagView> {
    const tag = await this.getTagById(id);
    if (!tag) {
      throw new DomainError(BLOG_ERROR.TAG_NOT_FOUND, '标签不存在');
    }
    return tag;
  }

  async getPopularTags(limit: number = 10): Promise<TagWithCount[]> {
    const postCountMap = await this.getPostCountMap();

    const tags = await this.tagRepository.find({
      order: { createdAt: 'DESC' },
    });

    const tagsWithCount = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      count: postCountMap.get(tag.id) || 0,
    }));

    return tagsWithCount
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private async getPostCountMap(): Promise<Map<string, number>> {
    const result = await this.postRepository
      .createQueryBuilder('post')
      .select('tag.id', 'tagId')
      .addSelect('COUNT(post.id)', 'count')
      .innerJoin('post.tags', 'tag')
      .where('post.deleted_at IS NULL')
      .groupBy('tag.id')
      .getRawMany();

    return new Map(result.map((item) => [item.tagId, parseInt(item.count, 10)]));
  }
}