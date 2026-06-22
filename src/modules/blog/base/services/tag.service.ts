// src/modules/blog/base/services/tag.service.ts

import { DomainError } from '@core/common/errors/domain-error';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BLOG_ERROR } from '../../blog.errors';
import type { CreateTagInput, TagSnapshot, UpdateTagInput } from '../../blog.types';
import { TagEntity } from '../entities/tag.entity';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly tagRepository: Repository<TagEntity>,
  ) {}

  async createTag(input: CreateTagInput): Promise<TagSnapshot> {
    const slug = input.slug || this.generateSlug(input.name);

    const existingSlug = await this.tagRepository.findOne({ where: { slug } });
    if (existingSlug) {
      throw new DomainError(BLOG_ERROR.SLUG_EXISTS, '标签链接已存在');
    }

    const existingName = await this.tagRepository.findOne({ where: { name: input.name } });
    if (existingName) {
      throw new DomainError(BLOG_ERROR.SLUG_EXISTS, '标签名称已存在');
    }

    const tag = this.tagRepository.create({
      name: input.name,
      slug,
    });

    const saved = await this.tagRepository.save(tag);
    return this.toTagSnapshot(saved);
  }

  async updateTag(id: string, input: UpdateTagInput): Promise<TagSnapshot> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      throw new DomainError(BLOG_ERROR.TAG_NOT_FOUND, '标签不存在');
    }

    if (input.name !== undefined) {
      const existingName = await this.tagRepository.findOne({
        where: { name: input.name },
      });
      if (existingName && existingName.id !== id) {
        throw new DomainError(BLOG_ERROR.SLUG_EXISTS, '标签名称已存在');
      }
      tag.name = input.name;
    }

    if (input.slug !== undefined && input.slug !== tag.slug) {
      const existingSlug = await this.tagRepository.findOne({ where: { slug: input.slug } });
      if (existingSlug) {
        throw new DomainError(BLOG_ERROR.SLUG_EXISTS, '标签链接已存在');
      }
      tag.slug = input.slug;
    }

    const saved = await this.tagRepository.save(tag);
    return this.toTagSnapshot(saved);
  }

  async deleteTag(id: string): Promise<boolean> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      throw new DomainError(BLOG_ERROR.TAG_NOT_FOUND, '标签不存在');
    }

    await this.tagRepository.delete(id);
    return true;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private toTagSnapshot(tag: TagEntity): TagSnapshot {
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }
}