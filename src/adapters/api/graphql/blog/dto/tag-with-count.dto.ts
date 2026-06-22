// src/adapters/api/graphql/blog/dto/tag-with-count.dto.ts

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('TagWithCount')
export class TagWithCountDto {
  @Field(() => ID, { description: '标签ID' })
  id!: string;

  @Field({ description: '标签名称' })
  name!: string;

  @Field({ description: 'URL友好标识' })
  slug!: string;

  @Field({ description: '文章数量' })
  count!: number;
}