// src/adapters/api/graphql/blog/dto/comment.dto.ts

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Comment')
export class CommentDto {
  @Field(() => ID, { description: '评论ID' })
  id!: string;

  @Field(() => ID, { description: '文章ID' })
  postId!: string;

  @Field(() => ID, { nullable: true, description: '父评论ID' })
  parentId!: string | null;

  @Field({ description: '嵌套层级' })
  level!: number;

  @Field({ description: '评论者昵称' })
  authorName!: string;

  @Field({ description: '评论者邮箱' })
  authorEmail!: string;

  @Field({ nullable: true, description: '评论者头像URL' })
  authorAvatar!: string | null;

  @Field({ description: '评论内容' })
  content!: string;

  @Field({ description: '评论状态' })
  status!: string;

  @Field({ nullable: true, description: '驳回原因' })
  rejectReason!: string | null;

  @Field({ description: '创建时间' })
  createdAt!: Date;

  @Field({ description: '更新时间' })
  updatedAt!: Date;
}