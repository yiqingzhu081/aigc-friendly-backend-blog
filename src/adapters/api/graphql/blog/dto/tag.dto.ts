// src/adapters/api/graphql/blog/dto/tag.dto.ts

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Tag')
export class TagDto {
  @Field(() => ID, { description: '标签ID' })
  id!: string;

  @Field({ description: '标签名称' })
  name!: string;

  @Field({ description: 'URL友好标识' })
  slug!: string;

  @Field({ description: '文章数量' })
  postCount!: number;

  @Field({ description: '创建时间' })
  createdAt!: Date;

  @Field({ description: '更新时间' })
  updatedAt!: Date;
}