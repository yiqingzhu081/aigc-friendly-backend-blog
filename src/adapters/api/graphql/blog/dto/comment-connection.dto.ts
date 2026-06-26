// src/adapters/api/graphql/blog/dto/comment-connection.dto.ts

import { Field, ObjectType } from '@nestjs/graphql';
import { CommentDto } from './comment.dto';

@ObjectType('CommentConnection')
export class CommentConnection {
  @Field(() => [CommentDto], { description: '评论列表' })
  items!: CommentDto[];

  @Field({ description: '总记录数' })
  total!: number;

  @Field({ description: '当前页码' })
  page!: number;

  @Field({ description: '每页大小' })
  pageSize!: number;
}